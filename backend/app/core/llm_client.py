from typing import Any, Dict, Optional

from openai import OpenAI

from app.core.config import get_settings


class LLMClient:
    """Thin wrapper around ai.io.net (OpenAI-compatible) or a local mock."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Optional[OpenAI] = None

    def _ensure_client(self) -> Optional[OpenAI]:
        if self.settings.llm_provider == "mock":
            return None
        if not self._client:
            self._client = OpenAI(api_key=self.settings.llm_api_key, base_url=self.settings.llm_base_url)
        return self._client

    def chat(self, messages: list[Dict[str, str]], response_format: Optional[dict[str, str]] = None) -> Dict[str, Any]:
        # Fallback mock branch for offline/dev runs.
        if self.settings.llm_provider == "mock" or not self.settings.llm_api_key:
            last_user_message = next((msg["content"] for msg in reversed(messages) if msg["role"] == "user"), "")
            return {
                "role": "assistant",
                "content": f"(mocked LLM response) I understood: {last_user_message[:200]}",
            }

        client = self._ensure_client()
        if not client:
            return {"role": "assistant", "content": "LLM client is not configured."}

        try:
            completion = client.chat.completions.create(
                model=self.settings.llm_model,
                messages=messages,
                temperature=self.settings.llm_temperature,
                max_completion_tokens=self.settings.llm_max_tokens,
                response_format=response_format,
                stream=False,
            )
            choice = completion.choices[0].message
            return {"role": choice.role or "assistant", "content": choice.content or ""}
        except Exception as exc:  # pragma: no cover - defensive networking branch
            return {"role": "assistant", "content": f"(LLM error) {exc}"}
