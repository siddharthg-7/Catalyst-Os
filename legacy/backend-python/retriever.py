import os
import time
import logging
import uuid
import math
from typing import List, Dict, Any

from backend.config import settings
from backend.embeddings import embedding_service
from backend.models import DocumentSource
from backend.utils import chunk_markdown_sections

logger = logging.getLogger("backend_retriever")


class QdrantRetriever:
    def __init__(self):
        self.qdrant_client = None
        self.local_vector_store: List[Dict[str, Any]] = []
        self.last_ingested_mtime = 0.0
        self._cross_encoder = None  # cached CrossEncoder, loaded on first use
        self._init_qdrant()

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Qdrant Setup
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def _init_qdrant(self):
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http import models as qmodels

            self.qdrant_client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
                api_key=settings.QDRANT_API_KEY or None,
                timeout=3
            )
            collections = [c.name for c in self.qdrant_client.get_collections().collections]
            if settings.QDRANT_COLLECTION not in collections:
                self.qdrant_client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=qmodels.VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=qmodels.Distance.COSINE
                    )
                )
            logger.info(f"âœ“ Qdrant connected â†’ collection '{settings.QDRANT_COLLECTION}'")
        except Exception as e:
            logger.warning(f"Qdrant offline ({e}) â†’ using local in-memory vector store")
            self.qdrant_client = None

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Knowledge Base Auto-Ingestion
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def auto_ingest_knowledge_md(self, force: bool = False) -> bool:
        """
        Loads, chunks, embeds, and indexes architecture/knowledge.md at startup.
        Automatically rebuilds if the file was modified since last ingestion.
        Prints debug information at every stage.
        """
        paths = [
            os.path.join(os.getcwd(), "architecture", "knowledge.md"),
            os.path.join(os.getcwd(), "knowledge.md"),
            r"c:\project-self-1\catalyst-os\architecture\knowledge.md",
        ]

        target_path = None
        for p in paths:
            if os.path.exists(p):
                target_path = p
                break

        if not target_path:
            print("âœ— knowledge.md NOT FOUND in any expected path!")
            logger.error("knowledge.md not found.")
            return False

        current_mtime = os.path.getmtime(target_path)
        already_loaded = (
            not force
            and current_mtime <= self.last_ingested_mtime
            and len(self.local_vector_store) > 0
        )
        if already_loaded:
            print(f"âœ“ knowledge.md already ingested ({len(self.local_vector_store)} chunks in memory, unchanged)")
            return True

        print()
        print("=" * 60)
        print("  KNOWLEDGE BASE INGESTION PIPELINE")
        print("=" * 60)

        # â”€â”€ Step 1: Load file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print(f"âœ— Failed to read {target_path}: {e}")
            logger.error(f"Failed to read knowledge.md: {e}")
            return False

        print(f"âœ“ Loading knowledge.md")
        print(f"  Path:       {target_path}")
        print(f"  Characters: {len(content)}")
        print(f"  First 500 chars:")
        print(f"  {content[:500]}")
        print()

        # â”€â”€ Step 2: Chunk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        t0 = time.time()
        sections_chunks = chunk_markdown_sections(content, chunk_size=600, overlap=100)
        chunk_time = time.time() - t0

        print(f"âœ“ Parsed & chunked markdown")
        print(f"  Total chunks: {len(sections_chunks)}  ({chunk_time:.2f}s)")
        print()
        for i, item in enumerate(sections_chunks[:5]):
            print(f"  Chunk {i+1} [{item['section']}]:")
            print(f"    {item['content'][:200]}")
            print()

        if not sections_chunks:
            print("âœ— CHUNKING PRODUCED 0 CHUNKS â€” aborting ingestion")
            return False

        # â”€â”€ Step 3: Embed & Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # Clear previous knowledge.md entries from local store
        self.local_vector_store = [
            d for d in self.local_vector_store
            if "knowledge.md" not in d.get("title", "")
        ]

        indexed_count = 0
        embed_errors = 0

        t0 = time.time()
        for idx, item in enumerate(sections_chunks):
            sec_title = item["section"]
            chunk_str = item["content"]
            doc_title = f"knowledge.md â†’ {sec_title}" if sec_title else "knowledge.md"

            try:
                vector = embedding_service.embed_text(chunk_str)
            except Exception as e:
                logger.error(f"Embedding error for chunk {idx}: {e}")
                embed_errors += 1
                continue

            doc_id = str(uuid.uuid4())
            payload = {
                "title": doc_title,
                "content": chunk_str,
                "section": sec_title,
                "chunk_index": idx,
                "metadata": {"source": "knowledge.md", "section": sec_title},
            }

            stored_in_qdrant = False
            if self.qdrant_client:
                try:
                    from qdrant_client.http import models as qmodels
                    self.qdrant_client.upsert(
                        collection_name=settings.QDRANT_COLLECTION,
                        points=[qmodels.PointStruct(id=doc_id, vector=vector, payload=payload)]
                    )
                    stored_in_qdrant = True
                except Exception as e:
                    logger.error(f"Qdrant upsert error for chunk {idx}: {e}")

            if not stored_in_qdrant:
                self.local_vector_store.append({
                    "id": doc_id,
                    "vector": vector,
                    **payload,
                })

            indexed_count += 1

        embed_time = time.time() - t0
        self.last_ingested_mtime = current_mtime

        storage = "Qdrant" if self.qdrant_client and embed_errors == 0 else "Local memory"
        print(f"âœ“ Embeddings generated")
        print(f"  Chunks embedded: {indexed_count}")
        print(f"  Embed errors:    {embed_errors}")
        print(f"  Time:            {embed_time:.2f}s")
        print()
        print(f"âœ“ Stored in vector database ({storage})")
        print(f"  Local store size: {len(self.local_vector_store)}")
        print("=" * 60)
        print()

        return indexed_count > 0

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Add Document (Admin uploads)
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def add_document(self, title: str, content_chunks: List[str], metadata: Dict[str, Any] = None) -> int:
        if not content_chunks:
            return 0

        metadata = metadata or {}
        indexed = 0

        for chunk in content_chunks:
            vector = embedding_service.embed_text(chunk)
            doc_id = str(uuid.uuid4())
            payload = {"title": title, "content": chunk, "metadata": metadata}

            stored = False
            if self.qdrant_client:
                try:
                    from qdrant_client.http import models as qmodels
                    self.qdrant_client.upsert(
                        collection_name=settings.QDRANT_COLLECTION,
                        points=[qmodels.PointStruct(id=doc_id, vector=vector, payload=payload)]
                    )
                    stored = True
                    indexed += 1
                    continue
                except Exception as e:
                    logger.error(f"Qdrant indexing error: {e}")

            if not stored:
                self.local_vector_store.append({
                    "id": doc_id, "vector": vector, "title": title,
                    "content": chunk, "metadata": metadata
                })
                indexed += 1

        return indexed

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Vector Search
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def search(self, query: str, top_k: int = 5) -> List[DocumentSource]:
        if not query.strip():
            return []

        # Ensure knowledge base is loaded
        if not self.local_vector_store and not self.qdrant_client:
            self.auto_ingest_knowledge_md()
        elif not self.local_vector_store:
            self.auto_ingest_knowledge_md()

        print()
        print("=" * 60)
        print("  RAG RETRIEVAL")
        print("=" * 60)
        print(f"  User query: {query}")

        # â”€â”€ Step 1: Embed query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        t0 = time.time()
        try:
            query_vector = embedding_service.embed_text(query)
        except Exception as e:
            print(f"  âœ— Query embedding failed: {e}")
            return []
        embed_time = time.time() - t0
        print(f"  âœ“ Query embedded ({embed_time*1000:.1f}ms, dim={len(query_vector)})")

        search_limit = max(10, top_k * 2)
        initial_results: List[DocumentSource] = []

        # â”€â”€ Step 2: Qdrant search (if available) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if self.qdrant_client:
            try:
                t0 = time.time()
                hits = self.qdrant_client.search(
                    collection_name=settings.QDRANT_COLLECTION,
                    query_vector=query_vector,
                    limit=search_limit
                )
                for hit in hits:
                    payload = hit.payload or {}
                    initial_results.append(DocumentSource(
                        title=payload.get("title", "knowledge.md"),
                        score=round(float(hit.score), 4),
                        snippet=payload.get("content", "")
                    ))
                print(f"  âœ“ Qdrant search: {len(initial_results)} results ({(time.time()-t0)*1000:.1f}ms)")
            except Exception as e:
                print(f"  âœ— Qdrant search failed: {e}")

        # â”€â”€ Step 3: Local cosine similarity (if Qdrant empty/unavailable) â”€â”€â”€â”€
        if not initial_results:
            print(f"  â†’ Using local cosine similarity on {len(self.local_vector_store)} stored vectors")
            t0 = time.time()

            norm_q = math.sqrt(sum(a * a for a in query_vector))
            scored = []
            for doc in self.local_vector_store:
                doc_vec = doc["vector"]
                dot = sum(a * b for a, b in zip(query_vector, doc_vec))
                norm_d = math.sqrt(sum(b * b for b in doc_vec))
                sim = dot / (norm_q * norm_d) if norm_q > 0 and norm_d > 0 else 0.0
                scored.append((sim, doc))

            scored.sort(key=lambda x: x[0], reverse=True)
            search_time = time.time() - t0

            for sim, doc in scored[:search_limit]:
                initial_results.append(DocumentSource(
                    title=doc.get("title", "knowledge.md"),
                    score=round(float(sim), 4),
                    snippet=doc.get("content", "")
                ))
            print(f"  âœ“ Local cosine search: {len(initial_results)} results ({search_time*1000:.1f}ms)")

        # Deduplicate by snippet content
        seen = set()
        deduped = []
        for r in initial_results:
            key = r.snippet[:200] if r.snippet else r.title
            if key not in seen:
                seen.add(key)
                deduped.append(r)
        initial_results = deduped
        print(f"  After dedup: {len(initial_results)} unique chunks")

        # COSINE SIMILARITY THRESHOLD: determines whether relevant context exists at all.
        # The CrossEncoder model (ms-marco-MiniLM-L-6-v2) was trained on web passages
        # and scores structured KB chunks inconsistently, so we use cosine similarity
        # as the primary "has context" gate instead of CrossEncoder scores.
        COSINE_THRESHOLD = 0.25
        top_cosine = initial_results[0].score if initial_results else 0.0
        print(f"  Top cosine similarity: {top_cosine:.4f} (threshold: {COSINE_THRESHOLD})")

        if top_cosine < COSINE_THRESHOLD:
            print(f"  [FILTER] Top cosine score {top_cosine:.4f} < {COSINE_THRESHOLD} -- query not in knowledge base")
            print("=" * 60)
            return []

        # Log top results before reranking
        print("\n  Top results before reranking:")
        for i, r in enumerate(initial_results[:5]):
            print(f"    [{i+1}] score={r.score:.4f}  title={r.title}")
            print(f"         snippet={r.snippet[:120]!r}")

        # CrossEncoder reranking (for ORDERING only, not for filtering)
        if initial_results:
            try:
                if self._cross_encoder is None:
                    from sentence_transformers import CrossEncoder
                    self._cross_encoder = CrossEncoder(
                        "cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512
                    )
                    print("  CrossEncoder model loaded and cached")
                pairs = [[query, doc.snippet or ""] for doc in initial_results]
                rerank_scores = self._cross_encoder.predict(pairs)
                for i in range(len(initial_results)):
                    initial_results[i].score = round(float(rerank_scores[i]), 4)
                initial_results.sort(key=lambda x: x.score, reverse=True)
                print("  [OK] CrossEncoder reranking applied (reordered by relevance)")
            except Exception as exc:
                print(f"  (CrossEncoder skipped: {exc})")

        final = initial_results[:top_k]
        print(f"\n  Final top-{top_k} chunks:")
        for i, r in enumerate(final):
            print(f"    [{i+1}] score={r.score:.4f}  [{r.title}]")
            print(f"         {r.snippet[:150]!r}")
        print("=" * 60)
        print()
        return final


retriever = QdrantRetriever()
