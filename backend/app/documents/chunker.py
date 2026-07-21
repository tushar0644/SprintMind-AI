import re
from typing import List, Dict, Any

def estimate_tokens(text: str) -> int:
    """
    Simple token count estimator based on character length (1 token approx 4 characters).
    """
    if not text:
        return 0
    return max(1, int(len(text) / 4))


class SemanticChunker:
    def __init__(self, max_chunk_size: int = 1000, min_chunk_size: int = 100, overlap: int = 200):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
        self.overlap = overlap

    def chunk_text(self, text: str, page_num: int = 1) -> List[Dict[str, Any]]:
        """
        Splits text of a specific page into semantic chunks, preserving headings and lists,
        respecting max_chunk_size, min_chunk_size, and overlap.
        """
        if not text or not text.strip():
            return []

        # Split page text into lines
        lines = text.split("\n")
        
        # Group lines into semantic blocks (headings + paragraphs, lists)
        blocks: List[str] = []
        current_block: List[str] = []
        
        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                if current_block:
                    blocks.append("\n".join(current_block))
                    current_block = []
                continue
            
            # Heading check (e.g. starts with '#' or short capitalized line)
            is_heading = trimmed.startswith("#") or (len(trimmed) < 80 and (trimmed.isupper() or trimmed.startswith("**")))
            
            # List item check (starts with '-', '*', '+', or digit dot '1.')
            is_list_item = bool(re.match(r"^[-*+]\s+", trimmed) or re.match(r"^\d+\.\s+", trimmed))
            
            if is_heading:
                # Flush the current block if it exists
                if current_block:
                    blocks.append("\n".join(current_block))
                current_block = [line]
            elif is_list_item:
                # Group list items in the same block if it's not too long
                if current_block and len("\n".join(current_block)) > 400:
                    blocks.append("\n".join(current_block))
                    current_block = [line]
                else:
                    current_block.append(line)
            else:
                current_block.append(line)
                
        if current_block:
            blocks.append("\n".join(current_block))

        # Assemble blocks into chunks
        chunks: List[str] = []
        current_chunk_text = ""
        
        for block in blocks:
            # If a single block itself exceeds max_chunk_size, we split it by sentences
            if len(block) > self.max_chunk_size:
                if current_chunk_text:
                    chunks.append(current_chunk_text)
                    current_chunk_text = ""
                
                # Split large block by sentence boundaries
                sentences = re.split(r"(?<=[.!?])\s+", block)
                for sentence in sentences:
                    if len(current_chunk_text) + len(sentence) > self.max_chunk_size:
                        if current_chunk_text:
                            chunks.append(current_chunk_text)
                            # Create overlap from the end of the previous chunk text
                            current_chunk_text = current_chunk_text[-self.overlap:] if self.overlap < len(current_chunk_text) else current_chunk_text
                        current_chunk_text = (current_chunk_text + " " + sentence).strip()
                    else:
                        current_chunk_text = (current_chunk_text + " " + sentence).strip()
            else:
                # If adding the block exceeds max_chunk_size
                if len(current_chunk_text) + len(block) > self.max_chunk_size:
                    if current_chunk_text:
                        chunks.append(current_chunk_text)
                        # Create overlap
                        current_chunk_text = current_chunk_text[-self.overlap:] if self.overlap < len(current_chunk_text) else current_chunk_text
                    current_chunk_text = (current_chunk_text + "\n\n" + block).strip()
                else:
                    if current_chunk_text:
                        current_chunk_text += "\n\n" + block
                    else:
                        current_chunk_text = block

        if current_chunk_text:
            chunks.append(current_chunk_text)

        # Filter out chunks smaller than min_chunk_size (unless it's the only chunk)
        final_chunks = []
        for i, chunk in enumerate(chunks):
            if len(chunk) >= self.min_chunk_size or (i == 0 and len(chunks) == 1):
                final_chunks.append(chunk)

        # Construct final dict structures
        result = []
        for idx, chunk_text in enumerate(final_chunks):
            result.append({
                "page": page_num,
                "text": chunk_text,
                "char_count": len(chunk_text),
                "token_estimate": estimate_tokens(chunk_text)
            })
            
        return result
