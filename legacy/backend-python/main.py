import sys
import io
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Force UTF-8 output on Windows to prevent UnicodeEncodeError with print statements
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from backend.config import settings
from backend.routes.chat import router as chat_router
from backend.routes.rag import router as rag_router
from backend.routes.audio import router as audio_router
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend_main")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version="2.4.0",
    description="Catalyst OS AI RAG Backend Engine powered by FastAPI, LangChain, Qdrant, & Redis."
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS for frontend Vite dev server & production client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)

from backend.retriever import retriever

# Include Routers
app.include_router(chat_router)
app.include_router(rag_router)
app.include_router(audio_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Catalyst OS RAG Backend starting — ingesting knowledge base...")
    success = retriever.auto_ingest_knowledge_md()
    if success:
        logger.info(f"Knowledge base ready: {len(retriever.local_vector_store)} chunks in memory")
    else:
        logger.error("Knowledge base ingestion FAILED — check knowledge.md path and logs")

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "version": "2.4.0",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Catalyst OS RAG Engine",
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
