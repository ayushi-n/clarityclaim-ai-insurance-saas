"""
Unified LLM client.

Every agent calls `chat()` on an instance of this class instead of talking to
Ollama or a cloud provider directly. Which backend is actually used is
decided by `mode` ("local" or "cloud"), which the UI toggle controls.

- local  -> Ollama REST API (http://localhost:11434 by default)
- cloud  -> Anthropic Messages API (requires ANTHROPIC_API_KEY)

If a backend isn't reachable / configured, `chat()` raises `LLMError` with a
clear message instead of silently returning fabricated content. Callers
(agents) catch this and record the failure honestly (status="error") rather
than inventing a result.
"""
import base64
import json
import re

import requests

import config


class LLMError(Exception):
    pass


def _extract_json(text):
    """Best-effort extraction of a JSON object from an LLM text response."""
    text = text.strip()
    # strip markdown code fences if present
    text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    # find the first {...} block
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    candidate = match.group(0) if match else text
    return json.loads(candidate)


class LLMClient:
    def __init__(self, mode="local"):
        self.mode = mode

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def chat_json(self, system, user, images=None, max_tokens=1200, temperature=0.0):
        """Call the model and parse the reply as JSON. Raises LLMError on
        failure to reach the backend, and json.JSONDecodeError if the model
        did not return parseable JSON (callers should handle both).
        Temperature defaults to 0.0 -- every agent in this codebase relies
        on reproducible structured output, not creative variation, so the
        model should pick its single most-likely answer rather than sample
        randomly each run."""
        raw = self.chat(system, user, images=images, max_tokens=max_tokens,
                         temperature=temperature)
        return _extract_json(raw), raw

    def chat(self, system, user, images=None, max_tokens=1200, temperature=0.0):
        if self.mode == "local":
            return self._call_ollama(system, user, images, max_tokens, temperature)
        elif self.mode == "cloud":
            return self._call_anthropic(system, user, images, max_tokens, temperature)
        raise LLMError(f"Unknown LLM mode '{self.mode}'")

    # ------------------------------------------------------------------
    # Backends
    # ------------------------------------------------------------------
    def _call_ollama(self, system, user, images, max_tokens, temperature):
        model = config.OLLAMA_VISION_MODEL if images else config.OLLAMA_TEXT_MODEL
        url = f"{config.OLLAMA_HOST.rstrip('/')}/api/chat"
        msg = {"role": "user", "content": user}
        if images:
            msg["images"] = [self._to_b64(img) for img in images]
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system}, msg],
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens, "seed": 42},
        }
        try:
            resp = requests.post(url, json=payload, timeout=180)
        except requests.exceptions.ConnectionError as e:
            raise LLMError(
                f"Could not reach local Ollama at {config.OLLAMA_HOST}. "
                f"Is Ollama running? (`ollama serve`, model pulled with "
                f"`ollama pull {model}`)"
            ) from e
        except requests.exceptions.Timeout as e:
            raise LLMError("Local Ollama request timed out.") from e

        if resp.status_code == 404:
            raise LLMError(
                f"Ollama model '{model}' not found. Pull it with: ollama pull {model}"
            )
        if resp.status_code != 200:
            raise LLMError(f"Ollama error {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        return data.get("message", {}).get("content", "")

    def _call_anthropic(self, system, user, images, max_tokens, temperature):
        if not config.ANTHROPIC_API_KEY:
            raise LLMError(
                "Cloud LLM selected but ANTHROPIC_API_KEY is not set. "
                "Add it to your .env file to enable Cloud LLM mode."
            )
        try:
            import anthropic
        except ImportError as e:
            raise LLMError("The 'anthropic' package is not installed (pip install anthropic).") from e

        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        model = config.ANTHROPIC_VISION_MODEL if images else config.ANTHROPIC_TEXT_MODEL

        content = [{"type": "text", "text": user}]
        if images:
            for img in images:
                content.insert(0, {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": self._to_b64(img),
                    },
                })
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=[{"role": "user", "content": content}],
            )
        except Exception as e:  # anthropic raises various APIError subclasses
            raise LLMError(f"Cloud LLM request failed: {e}") from e

        return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")

    @staticmethod
    def _to_b64(img_bytes_or_path):
        if isinstance(img_bytes_or_path, (bytes, bytearray)):
            return base64.b64encode(img_bytes_or_path).decode("utf-8")
        with open(img_bytes_or_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")


def check_ollama_status():
    """Lightweight health check used by the Settings page."""
    try:
        r = requests.get(f"{config.OLLAMA_HOST.rstrip('/')}/api/tags", timeout=3)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            return True, models
        return False, []
    except requests.exceptions.RequestException:
        return False, []
