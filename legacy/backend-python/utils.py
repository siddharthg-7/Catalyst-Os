import re
import logging
from typing import List, Dict

logger = logging.getLogger("backend_utils")


def chunk_markdown_sections(text: str, chunk_size: int = 600, overlap: int = 100) -> List[Dict]:
    """
    Splits markdown into heading-aware chunks.
    
    Strategy:
    1. Split the document by H1/H2/H3 headings and horizontal rules (---)
    2. For each section, keep the heading prepended to all chunks in that section
    3. Split long sections into overlapping character-level chunks
    4. Never split in the middle of a word
    
    Returns a list of dicts: [{"section": "Heading Text", "content": "chunk text"}, ...]
    """
    if not text:
        return []

    text = text.replace("\r\n", "\n").strip()

    print("=" * 60)
    print("CHUNKER: Starting markdown chunking")
    print(f"CHUNKER: Input length = {len(text)} characters")
    print("=" * 60)

    # â”€â”€ 1. Split by headings and horizontal rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Regex: match a line starting with # (heading) or a standalone ---
    heading_pattern = re.compile(r'(?m)^(#{1,3}\s+.+|---+)\s*$')

    # Get all match positions
    splits = [(0, "", text)]  # (start, heading, full_text_from_start)

    positions = []
    for m in heading_pattern.finditer(text):
        positions.append((m.start(), m.group(0).strip()))

    # Build sections as (heading, body)
    sections: List[tuple] = []
    for idx, (pos, heading) in enumerate(positions):
        end = positions[idx + 1][0] if idx + 1 < len(positions) else len(text)
        body = text[pos:end]
        # Strip the heading line itself from body content
        body_lines = body.split("\n")
        content = "\n".join(body_lines[1:]).strip()
        # Clean heading
        clean_heading = re.sub(r'^#+\s*', '', heading).strip()
        if clean_heading == "---" or clean_heading.startswith("-"):
            clean_heading = "Overview"
        sections.append((clean_heading, content))

    # Handle content before first heading (preamble)
    if positions:
        preamble = text[:positions[0][0]].strip()
        if preamble:
            sections.insert(0, ("Overview", preamble))
    else:
        # No headings found at all â€” treat as one section
        sections = [("Overview", text)]

    print(f"CHUNKER: Found {len(sections)} sections")
    for i, (h, b) in enumerate(sections[:5]):
        print(f"  Section {i+1}: [{h}] ({len(b)} chars)")

    # â”€â”€ 2. Chunk each section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    result: List[Dict] = []

    for heading, body in sections:
        if not body.strip():
            continue

        # For each section, prepend heading to the chunk so context is preserved
        prefix = f"{heading}\n\n" if heading and heading != "Overview" else ""
        full_text = prefix + body.strip()

        chunks = _split_with_overlap(full_text, chunk_size=chunk_size, overlap=overlap)
        for chunk in chunks:
            if chunk.strip():
                result.append({
                    "section": heading,
                    "content": chunk.strip()
                })

    print(f"CHUNKER: Total chunks produced = {len(result)}")
    print("=" * 60)

    # Try to also use langchain splitter if available (better quality)
    try:
        from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
        headers_to_split_on = [
            ("#", "h1"),
            ("##", "h2"),
            ("###", "h3"),
        ]
        md_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on, strip_headers=False)
        char_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap)

        md_docs = md_splitter.split_text(text)
        lc_result = []
        for doc in md_docs:
            sub_chunks = char_splitter.split_text(doc.page_content)
            heading = " > ".join(filter(None, [
                doc.metadata.get("h1", ""),
                doc.metadata.get("h2", ""),
                doc.metadata.get("h3", "")
            ])) or "Overview"
            for chunk in sub_chunks:
                if chunk.strip():
                    lc_result.append({"section": heading, "content": chunk.strip()})

        if lc_result:
            print(f"CHUNKER: LangChain MarkdownHeaderTextSplitter produced {len(lc_result)} chunks (using these)")
            return lc_result
    except Exception:
        pass

    return result


def _split_with_overlap(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """
    Splits text into overlapping character-level chunks.
    Breaks at word boundaries to avoid cutting words.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            chunks.append(text[start:])
            break

        # Walk back to a word boundary
        boundary = end
        while boundary > start and text[boundary] not in (' ', '\n', '\t'):
            boundary -= 1

        if boundary == start:
            boundary = end  # No whitespace found â€” hard cut

        chunks.append(text[start:boundary])
        # Move forward by (chunk_size - overlap)
        start = boundary - overlap
        if start < 0:
            start = 0

    return chunks


def parse_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extracts plain text from raw PDF bytes using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error parsing PDF: {str(e)}")
        return ""


def parse_html_bytes(html_bytes: bytes) -> str:
    """Extracts plain text from raw HTML using BeautifulSoup4."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_bytes, "html.parser")
        return soup.get_text(separator="\n", strip=True)
    except Exception as e:
        logger.error(f"Error parsing HTML: {str(e)}")
        return ""


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """Simple character-based text chunker with overlap. Used by add_document."""
    return _split_with_overlap(text, chunk_size=chunk_size, overlap=overlap)

