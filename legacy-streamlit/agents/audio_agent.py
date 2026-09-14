"""
Audio Agent

Analyzes the transcript of a customer/witness audio statement. Transcription
itself happens upstream (utils/audio.py) -- this agent reasons over text,
the same way the Document Agent does, but treats it as a spoken statement
rather than paperwork.

Confidence is computed deterministically from real evidence signals (length
of the statement, number of concrete statements extracted, whether an
impact location could be determined) instead of the model's own
self-reported confidence number, which is not reproducible run-to-run.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You are the Audio Agent inside ClarityClaim, an insurance
claims intelligence system. You analyze the transcript of a recorded
customer or witness statement about an incident.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this
exact shape:
{
  "summary": "2-3 sentence summary of what the speaker described",
  "impact_location": one of ["front","rear","side","rollover","multiple","unknown"],
  "key_statements": ["short quote-free factual bullet from the statement", "..."],
  "confidence": integer 0-100 (how confident you are in this reading, lower if the
     statement is vague, contradicts itself, or omits key details)
}
Base impact_location strictly on what the speaker said. If not mentioned,
use "unknown".
"""


def _evidence_confidence(transcript_text, data):
    word_count = len((transcript_text or "").split())
    statements = data.get("key_statements") or []
    if not isinstance(statements, list):
        statements = []

    base = 25.0 + min(30.0, word_count / 15.0)  # longer statement, more to go on
    statement_score = min(20.0, 5.0 * len(statements))
    if data.get("impact_location") not in (None, "unknown"):
        location_score = 15.0
    else:
        location_score = -10.0  # a vague statement that omits location is a real signal

    score = base + statement_score + location_score
    return round(max(0.0, min(100.0, score)), 1)


def run(claim, transcript_text):
    from llm.client import LLMClient
    import streamlit as st

    if not transcript_text or not transcript_text.strip():
        return {"status": "skipped", "summary": "No audio statement / transcript provided for this claim.",
                "impact_location": "unknown", "confidence": 0.0, "raw": {}}

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    user_prompt = f"""Claim {claim.get('claim_id')} — {claim.get('incident_type')}.

TRANSCRIPT OF RECORDED STATEMENT:
{transcript_text[:6000]}
"""

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.0)
        confidence = _evidence_confidence(transcript_text, data)
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
