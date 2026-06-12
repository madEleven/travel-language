import json
import re
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage


service = AIHubService()


async def extract_text_from_image(image_data_uri: str) -> str:
    """Extract text from an image using AI multimodal capability."""
    request = GenTxtRequest(
        messages=[
            ChatMessage(role="system", content="You are an OCR expert. Extract ALL visible text from the image. Return ONLY the extracted text, nothing else. If there are multiple lines, separate them with newlines. If no text is found, return empty string."),
            ChatMessage(
                role="user",
                content=[
                    {"type": "text", "text": "Please extract all text from this image. Return only the raw text content."},
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                ],
            ),
        ],
        model="gemini-2.5-pro",
    )

    response = await service.gentxt(request)
    return response.content.strip()


async def extract_text_with_positions(image_data_uri: str) -> list[dict]:
    """Extract text from an image with approximate bounding box positions.
    
    Returns a list of text blocks with their positions as percentages of image dimensions.
    Each block: {"text": str, "x": float, "y": float, "width": float, "height": float}
    Coordinates are percentages (0-100) relative to image dimensions.
    """
    request = GenTxtRequest(
        messages=[
            ChatMessage(role="system", content="""You are an advanced OCR expert that can detect text and its approximate position in images.
Extract ALL visible text blocks from the image. For each text block, estimate its position as a percentage of the image dimensions.

Return ONLY valid JSON array. Each element must have:
- "text": the extracted text content
- "x": left position as percentage (0-100) of image width
- "y": top position as percentage (0-100) of image height  
- "width": width as percentage (0-100) of image width
- "height": height as percentage (0-100) of image height

Group nearby text that belongs together (e.g. a sentence or paragraph) into one block.
Be as accurate as possible with positions. If text is centered, x should reflect that.
If no text is found, return an empty array [].

Example output:
[
  {"text": "Hello World", "x": 10, "y": 5, "width": 80, "height": 8},
  {"text": "Welcome", "x": 30, "y": 45, "width": 40, "height": 6}
]"""),
            ChatMessage(
                role="user",
                content=[
                    {"type": "text", "text": "Extract all text from this image with their approximate positions. Return JSON array only."},
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                ],
            ),
        ],
        model="gemini-2.5-pro",
    )

    response = await service.gentxt(request)
    raw = response.content.strip()

    # Extract JSON from possible markdown code blocks
    if raw.startswith("```"):
        match = re.search(r"```(?:json)?\n(.*?)```", raw, re.DOTALL)
        if match:
            raw = match.group(1).strip()

    # Find the JSON array
    start = raw.find("[")
    end = raw.rfind("]")
    if start >= 0 and end > start:
        raw = raw[start:end + 1]

    try:
        blocks = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return single block with all text
        plain_text = await extract_text_from_image(image_data_uri)
        if plain_text:
            return [{"text": plain_text, "x": 5, "y": 5, "width": 90, "height": 90}]
        return []

    # Validate and clean blocks
    valid_blocks = []
    for block in blocks:
        if isinstance(block, dict) and "text" in block and block["text"].strip():
            valid_blocks.append({
                "text": block["text"].strip(),
                "x": max(0, min(100, float(block.get("x", 0)))),
                "y": max(0, min(100, float(block.get("y", 0)))),
                "width": max(5, min(100, float(block.get("width", 50)))),
                "height": max(3, min(100, float(block.get("height", 10)))),
            })

    return valid_blocks