import json
import logging
from typing import List, Dict, Any, Optional
from backend.config import settings

logger = logging.getLogger("backend_memory")

class ConversationMemoryManager:
    def __init__(self):
        self.redis_client = None
        self.in_memory_store: Dict[str, List[Dict[str, Any]]] = {}
        self._init_redis()

    def _init_redis(self):
        try:
            import redis
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                decode_responses=True,
                socket_timeout=2
            )
            self.redis_client.ping()
            logger.info("Connected to Redis conversation memory store.")
        except Exception as e:
            logger.warning(f"Redis memory store offline ({str(e)}). Utilizing local in-memory fallback buffer.")
            self.redis_client = None

    def add_message(self, session_id: str, role: str, content: str):
        msg = {"role": role, "content": content}
        if self.redis_client:
            try:
                self.redis_client.rpush(f"session:{session_id}:messages", json.dumps(msg))
                self.redis_client.expire(f"session:{session_id}:messages", 86400) # 24h retention
                return
            except Exception as e:
                logger.error(f"Redis add_message error: {str(e)}")

        if session_id not in self.in_memory_store:
            self.in_memory_store[session_id] = []
        self.in_memory_store[session_id].append(msg)

    def get_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        if self.redis_client:
            try:
                raw_msgs = self.redis_client.lrange(f"session:{session_id}:messages", -limit, -1)
                return [json.loads(m) for m in raw_msgs]
            except Exception as e:
                logger.error(f"Redis get_history error: {str(e)}")

        return self.in_memory_store.get(session_id, [])[-limit:]

    def get_summary(self, session_id: str) -> str:
        if self.redis_client:
            try:
                summary = self.redis_client.get(f"session:{session_id}:summary")
                return summary if summary else ""
            except Exception as e:
                logger.error(f"Redis get_summary error: {str(e)}")
        
        return getattr(self, "in_memory_summaries", {}).get(session_id, "")

    def set_summary(self, session_id: str, summary: str):
        if self.redis_client:
            try:
                self.redis_client.set(f"session:{session_id}:summary", summary, ex=86400)
                return
            except Exception as e:
                logger.error(f"Redis set_summary error: {str(e)}")
        
        if not hasattr(self, "in_memory_summaries"):
            self.in_memory_summaries = {}
        self.in_memory_summaries[session_id] = summary

    def clear_history(self, session_id: str):
        if self.redis_client:
            try:
                self.redis_client.delete(f"session:{session_id}:messages")
                self.redis_client.delete(f"session:{session_id}:summary")
            except Exception as e:
                logger.error(f"Redis clear_history error: {str(e)}")

        if session_id in self.in_memory_store:
            del self.in_memory_store[session_id]
        if hasattr(self, "in_memory_summaries") and session_id in self.in_memory_summaries:
            del self.in_memory_summaries[session_id]

memory_manager = ConversationMemoryManager()
