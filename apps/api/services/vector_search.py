import logging

import google.generativeai as genai

from config import settings
from models.database import get_supabase

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMS = 768


async def embed_text(text: str) -> list[float] | None:
    if not settings.gemini_api_key:
        return None
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        return result["embedding"]
    except Exception:
        logger.exception("Embedding failed")
        return None


async def upsert_faq_embedding(faq_id: str, question: str, answer: str) -> None:
    text = f"{question}\n{answer}"
    emb = await embed_text(text)
    if not emb:
        return
    try:
        sb = get_supabase()
        sb.table("faqs").update({"embedding": emb}).eq("id", faq_id).execute()
    except Exception:
        logger.exception("Failed to write faq embedding")


async def search_faqs(
    business_id: str, query: str, threshold: float = 0.7, count: int = 3
) -> list[dict]:
    emb = await embed_text(query)
    if not emb:
        return []
    try:
        sb = get_supabase()
        res = sb.rpc(
            "search_faqs",
            {
                "p_business_id": business_id,
                "p_query_embedding": emb,
                "p_match_threshold": threshold,
                "p_match_count": count,
            },
        ).execute()
        return res.data or []
    except Exception:
        logger.exception("Vector FAQ search failed")
        return []
