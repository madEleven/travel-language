import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.translate import translate_text

router = APIRouter(prefix="/api/v1/translate", tags=["translate"])


class TranslateRequest(BaseModel):
    text: str
    target_languages: list[str]


class TranslationItem(BaseModel):
    text: str
    pronunciation: str


class TranslateResponse(BaseModel):
    translations: dict[str, TranslationItem]


@router.post("/", response_model=TranslateResponse)
async def translate(data: TranslateRequest):
    """Translate Chinese text to multiple target languages."""
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    valid_languages = {"ko", "ja", "ru", "en", "it", "es", "fr", "th", "tr", "vi", "kk", "zh"}
    target_langs = [lang for lang in data.target_languages if lang in valid_languages]

    if not target_langs:
        raise HTTPException(status_code=400, detail="No valid target languages specified")

    try:
        translations = await translate_text(data.text.strip(), target_langs)
        return TranslateResponse(translations=translations)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logging.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="Translation failed. Please try again.")