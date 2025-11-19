from typing import Any, Dict

from app.core.config import get_settings


class LLMClient:
    """Thin wrapper around a future LLM provider (OpenAI, Azure, etc.)."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def chat(self, messages: list[Dict[str, str]]) -> Dict[str, Any]:
        # TODO: integrate with a real LLM provider and handle streaming, tools, etc.
        last_user_message = next((msg["content"] for msg in reversed(messages) if msg["role"] == "user"), "")
        return {
            "role": "assistant",
            "content": f"(mocked LLM response) I understood: {last_user_message[:200]}",
        }

