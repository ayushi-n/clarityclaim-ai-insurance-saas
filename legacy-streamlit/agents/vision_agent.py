"""
Vision Agent

Analyzes uploaded damage photos using a multimodal LLM (a local vision model
via Ollama, e.g. llama3.2-vision/llava, or a cloud multimodal model) and
reports what damage is visible and where the impact appears to be.

As with the Document Agent, confidence is computed deterministically from
real evidence signals (how many corroborating photos were supplied, how
many concrete damage observations were extracted, whether an impact
location could be determined) instead of trusting the model's own
self-reported confidence number, which is not reproducible run-to-run.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You are the Vision Agent inside ClarityClaim, an insurance
claims intelligence system. You visually inspect damage photographs attached
to a claim.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this
exact shape:
{
  "summary": "2-3 sentence description of the visible damage",
  "impact_location": one of ["front","rear","side","rollover","multiple","unknown"],
  "damage_observations": ["short factual bullet about what is visibly damaged", "..."],
  "confidence": integer 0-100 (how confident you are in this visual reading)
}
Describe only what is visible in the image(s). Do not guess at cause or
speculate about fraud.
"""


def _evidence_confidence(image_paths, data):
    observations = data.get("damage_observations") or []
    if not isinstance(observations, list):
        observations = []

    base = 40.0 + min(30.0, 10.0 * len(image_paths))  # more corroborating photos
    obs_score = min(20.0, 5.0 * len(observations))
    location_score = 10.0 if data.get("impact_location") not in (None, "unknown") else 0.0

    score = base + obs_score + location_score
    return round(max(0.0, min(100.0, score)), 1)


def run(claim, image_paths):
    from llm.client import LLMClient
    import streamlit as st

    if not image_paths:
        return {"status": "skipped", "summary": "No damage images were uploaded for this claim.",
                "impact_location": "unknown", "confidence": 0.0, "raw": {}}

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    user_prompt = (
        f"Claim {claim.get('claim_id')} — {claim.get('incident_type')}. "
        f"{len(image_paths)} damage photo(s) attached. Analyze the visible damage."
    )

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, images=image_paths,
                                      temperature=0.0)
        confidence = _evidence_confidence(image_paths, data)
        return {
            "status": "complete",
            "summary": data.get("summary", ""),
            "impact_location": data.get("impact_location", "unknown"),
            "confidence": confidence,
            "raw": data,
        }
    except LLMError as e:
        return {"status": "error", "summary": str(e), "impact_location": "unknown",
                "confidence": 0.0, "raw": {}}
    except (json.JSONDecodeError, ValueError) as e:
        return {"status": "error", "summary": f"Model did not return valid JSON: {e}",
                "impact_location": "unknown", "confidence": 0.0, "raw": {}}
