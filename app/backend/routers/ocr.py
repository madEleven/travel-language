import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.ocr import extract_text_from_image, extract_text_with_positions

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])


class OCRRequest(BaseModel):
    image: str  # base64 data URI


class OCRResponse(BaseModel):
    text: str


class TextBlock(BaseModel):
    text: str
    x: float
    y: float
    width: float
    height: float


class OCRWithPositionsResponse(BaseModel):
    blocks: list[TextBlock]


@router.post("/", response_model=OCRResponse)
async def ocr(data: OCRRequest):
    """Extract text from an image using AI OCR."""
    if not data.image.strip():
        raise HTTPException(status_code=400, detail="Image data cannot be empty")

    if not data.image.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Image must be a base64 data URI")

    try:
        text = await extract_text_from_image(data.image)
        return OCRResponse(text=text)
    except Exception as e:
        logging.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail="OCR failed. Please try again.")


@router.post("/with-positions", response_model=OCRWithPositionsResponse)
async def ocr_with_positions(data: OCRRequest):
    """Extract text from an image with position information for overlay translation."""
    if not data.image.strip():
        raise HTTPException(status_code=400, detail="Image data cannot be empty")

    if not data.image.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Image must be a base64 data URI")

    try:
        blocks = await extract_text_with_positions(data.image)
        return OCRWithPositionsResponse(blocks=blocks)
    except Exception as e:
        logging.error(f"OCR with positions error: {e}")
        raise HTTPException(status_code=500, detail="OCR failed. Please try again.")