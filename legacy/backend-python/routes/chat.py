import time
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.models import ChatRequest, ChatResponse, DocumentSource
from backend.retriever import retriever
from backend.memory import memory_manager
from backend.config import settings

logger = logging.getLogger("chat_router")
router = APIRouter(prefix="/api/chat", tags=["chat"])

NOT_FOUND_MSG = "I require more information to answer this query. Please upload relevant documents to the Knowledge Center."

SYSTEM_PROMPT = """You are Catalyst OS AI — an intelligent assistant that answers questions about Catalyst OS using only the retrieved context below.

RULES:
1. Answer ONLY using the supplied retrieved context.
2. Never use prior knowledge or hallucinate.
3. If the answer is not in the context, respond exactly with: "I require more information to answer this query. Please upload relevant documents to the Knowledge Center."
4. Keep responses concise and helpful.
5. Use Markdown formatting (bold, lists, tables) where appropriate.
6. Never output fake metrics, personas, or roleplay responses."""


def get_llm():
    """Returns a LangChain LLM instance using available API keys."""
    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                api_key=settings.GEMINI_API_KEY,
                temperature=0.1,
                streaming=True,
            )
        except Exception as e:
            logger.error(f"Gemini LLM init failed: {e}")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.1)
        except Exception as e:
            logger.error(f"OpenAI LLM init failed: {e}")

    logger.error("No LLM API key configured (GEMINI_API_KEY or OPENAI_API_KEY required)")
    return None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /api/chat â€” Standard non-streaming endpoint
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("", response_model=ChatResponse)
async def handle_chat(payload: ChatRequest):
    """Standard non-streaming RAG chat endpoint."""
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    start_time = time.time()
    user_query = payload.messages[-1].content
    session_id = "default_session"

    memory_manager.add_message(session_id, "user", user_query)

    # Retrieve context
    sources = retriever.search(user_query, top_k=5)
    context = "\n\n".join([
        f"[Source: {s.title} | Score: {s.score}]\n{s.snippet}"
        for s in sources
    ]) if sources else ""

    llm = get_llm()

    if not llm:
        reply = NOT_FOUND_MSG + " (No LLM API key configured.)"
    elif not context:
        print(f"  âœ— No context retrieved for query: {user_query!r}")
        reply = NOT_FOUND_MSG
    else:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

            history = memory_manager.get_history(session_id, limit=4)
            prompt_content = f"Context:\n{context}\n\nQuestion:\n{user_query}\n\nAnswer:"

            print()
            print("=" * 60)
            print("  LLM PROMPT")
            print("=" * 60)
            print(prompt_content[:1000])
            print("=" * 60)

            langchain_msgs = [SystemMessage(content=SYSTEM_PROMPT)]
            for msg in history[:-1]:
                if msg["role"] == "user":
                    langchain_msgs.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_msgs.append(AIMessage(content=msg["content"]))
            langchain_msgs.append(HumanMessage(content=prompt_content))

            response = llm.invoke(langchain_msgs)
            reply = response.content
        except Exception as e:
            logger.error(f"LLM invoke error: {e}")
            reply = NOT_FOUND_MSG

    memory_manager.add_message(session_id, "assistant", reply)

    exec_time = round(time.time() - start_time, 3)
    print(f"  âœ“ Response generated in {exec_time}s")

    return ChatResponse(reply=reply, sources=sources, execution_time_seconds=exec_time)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /api/chat/stream â€” SSE streaming endpoint
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/stream")
async def handle_chat_stream(payload: ChatRequest):
    """
    Streaming Chatbot Endpoint â€” delivers token-by-token SSE stream.
    Implements pure RAG with full debug logging.
    """
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    user_query = payload.messages[-1].content
    session_id = "default_session"

    memory_manager.add_message(session_id, "user", user_query)

    # Retrieve context
    t_retrieve = time.time()
    sources = retriever.search(user_query, top_k=5)
    retrieve_time = time.time() - t_retrieve

    context = "\n\n".join([
        f"[Source: {s.title} | Score: {s.score}]\n{s.snippet}"
        for s in sources
    ]) if sources else ""

    llm = get_llm()

    async def token_generator() -> AsyncGenerator[str, None]:
        # â”€â”€ No context retrieved â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if not context:
            print(f"\n  âœ— RETRIEVAL EMPTY for: {user_query!r}")
            print(f"    Local store size: {len(retriever.local_vector_store)}")
            yield f"data: {json.dumps({'text': NOT_FOUND_MSG})}\n\n"
            yield f"data: {json.dumps({'sources': [], 'debug': {'retrieve_time': round(retrieve_time*1000), 'chunks_found': 0}})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # â”€â”€ No LLM configured â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if not llm:
            msg = NOT_FOUND_MSG + " (No LLM API key configured in .env)"
            yield f"data: {json.dumps({'text': msg})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # â”€â”€ Build prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        try:
            from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

            history = memory_manager.get_history(session_id, limit=4)
            summary = memory_manager.get_summary(session_id)

            sys_text = SYSTEM_PROMPT
            if summary:
                sys_text += f"\n\nConversation Summary:\n{summary}"

            prompt_content = f"Context:\n{context}\n\nQuestion:\n{user_query}\n\nAnswer:"

            print()
            print("=" * 60)
            print("  LLM PROMPT (STREAM)")
            print("=" * 60)
            print(f"  Context length: {len(context)} chars, {len(sources)} sources")
            print(f"  Prompt preview:\n{prompt_content[:800]}")
            print("=" * 60)

            langchain_msgs = [SystemMessage(content=sys_text)]
            for msg in history[:-1]:
                if msg["role"] == "user":
                    langchain_msgs.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_msgs.append(AIMessage(content=msg["content"]))
            langchain_msgs.append(HumanMessage(content=prompt_content))

            # â”€â”€ Stream tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t_llm = time.time()
            full_reply = ""
            token_count = 0

            async for chunk in llm.astream(langchain_msgs):
                content = chunk.content
                if content:
                    full_reply += content
                    token_count += 1
                    yield f"data: {json.dumps({'text': content})}\n\n"

            llm_time = time.time() - t_llm
            print(f"  âœ“ Streamed {token_count} chunks in {llm_time:.2f}s")

            memory_manager.add_message(session_id, "assistant", full_reply)

            # â”€â”€ Send sources + debug metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            debug_info = {
                "chunks_retrieved": len(sources),
                "retrieve_time_ms": round(retrieve_time * 1000),
                "llm_time_ms": round(llm_time * 1000),
                "context_chars": len(context),
                "prompt_tokens_approx": len(prompt_content) // 4,
            }
            yield f"data: {json.dumps({'sources': [s.model_dump() for s in sources], 'debug': debug_info})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            print(f"  âœ— STREAMING ERROR: {e}")
            yield f"data: {json.dumps({'text': NOT_FOUND_MSG})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /api/chat/feedback â€” Feedback logging
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/feedback")
async def log_feedback(payload: dict):
    """Logs user message feedback (thumbs up / thumbs down)."""
    message_id = payload.get("message_id")
    rating = payload.get("rating")  # 'up' or 'down'
    logger.info(f"Feedback for message {message_id}: {rating}")
    return {"success": True, "message": "Feedback recorded."}

