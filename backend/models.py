from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import time

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message sender role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Text content of the message")

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="List of conversation messages")
    goal: Optional[str] = Field(None, description="Optional strategic goal or topic")
    stream: bool = Field(False, description="Whether to stream response tokens")

class DocumentSource(BaseModel):
    title: str
    score: float
    snippet: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    sources: List[DocumentSource] = []
    execution_time_seconds: float = 0.0

class DocumentIngestRequest(BaseModel):
    title: str
    content: str
    metadata: Dict[str, Any] = {}

class DocumentIngestResponse(BaseModel):
    success: bool
    document_id: str
    chunks_indexed: int
    message: str

class SearchQuery(BaseModel):
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    results: List[DocumentSource]
    query: str
