import logging
from typing import List
from backend.config import settings

logger = logging.getLogger("backend_embeddings")

class EmbeddingService:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model: {settings.EMBEDDING_MODEL_NAME}...")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(f"SentenceTransformer not available or failed to load ({str(e)}). Using deterministic fallback encoder.")
            self.model = None

    def embed_text(self, text: str) -> List[float]:
        if not text:
            return [0.0] * settings.EMBEDDING_DIMENSION

        if self.model:
            try:
                embedding = self.model.encode(text)
                return embedding.tolist()
            except Exception as e:
                logger.error(f"Error encoding with SentenceTransformer: {str(e)}")

        # Deterministic pseudo-random embedding fallback (dimension 384)
        import hashlib
        h = hashlib.sha256(text.encode('utf-8')).hexdigest()
        vector = []
        for i in range(settings.EMBEDDING_DIMENSION):
            val = (int(h[(i * 2) % len(h):((i * 2) + 2) % len(h)], 16) / 255.0) * 2.0 - 1.0
            vector.append(round(val, 4))
        return vector

    def embed_documents(self, docs: List[str]) -> List[List[float]]:
        return [self.embed_text(d) for d in docs]

embedding_service = EmbeddingService()
