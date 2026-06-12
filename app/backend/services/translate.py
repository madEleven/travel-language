import json
import re
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage


service = AIHubService()


async def translate_text(text: str, target_languages: list[str]) -> dict:
    """Translate text to multiple target languages using AI.
    
    Supports:
    - Chinese text → any target language
    - Any language text → Chinese (zh) or English (en)
    """
    lang_map = {
        "ko": "Korean",
        "ja": "Japanese",
        "ru": "Russian",
        "en": "English",
        "it": "Italian",
        "es": "Spanish",
        "fr": "French",
        "th": "Thai",
        "tr": "Turkish",
        "vi": "Vietnamese",
        "kk": "Kazakh",
        "zh": "Chinese (Simplified)",
    }

    target_lang_names = [lang_map.get(code, code) for code in target_languages if code in lang_map]

    if not target_lang_names:
        raise ValueError("No valid target languages specified")

    prompt = f"""Translate the following text into these languages: {', '.join(target_lang_names)}.

Text to translate: "{text}"

Return ONLY valid JSON in this exact format:
{{
  "translations": {{
    "{target_languages[0]}": {{"text": "translation here", "pronunciation": "romanized pronunciation or pinyin"}}
  }}
}}

Only include the languages requested: {', '.join(target_languages)}.
Make translations natural and conversational, suitable for travel situations.
For pronunciation:
- For Chinese (zh): use pinyin with tone marks
- For Japanese: use romaji
- For Korean: use romanization
- For English: just repeat the English text
- For other languages: use simple romanization that helps with pronunciation"""

    request = GenTxtRequest(
        messages=[
            ChatMessage(role="system", content="You are a professional translator specializing in travel phrases. Always return valid JSON only. Detect the source language automatically and translate to the requested target languages."),
            ChatMessage(role="user", content=prompt),
        ],
        model="deepseek-chat",
    )

    response = await service.gentxt(request)
    raw_content = response.content.strip()

    def extract_json_block(text: str) -> str:
        if text.startswith("```"):
            match = re.search(r"```(?:json)?\n(.*?)```", text, re.DOTALL)
            if match:
                text = match.group(1).strip()
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return text[start:end + 1]
        return text

    payload_text = extract_json_block(raw_content)

    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError:
        repair_request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content="Fix this into valid JSON only."),
                ChatMessage(role="user", content=payload_text),
            ],
            model="deepseek-chat",
        )
        repaired = await service.gentxt(repair_request)
        try:
            payload = json.loads(extract_json_block(repaired.content.strip()))
        except json.JSONDecodeError:
            raise ValueError("AI output parsing failed. Please try again.")

    if "translations" not in payload:
        raise ValueError("AI output missing translations field")

    return payload["translations"]