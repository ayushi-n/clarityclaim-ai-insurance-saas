"""
Missing Evidence Agent

Looks at what evidence has actually been submitted for a claim (documents,
images, audio) plus the incident type, and flags what a claim of this type
would typically need but is absent — so the routing decision knows what's
missing before it commits to auto-approval.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You are the Missing Information Agent inside ClarityClaim,
an insurance claims intelligence system. Given the incident type and a list
of evidence already submitted, identify evidence that is typically required
to fully adjudicate a claim of this type but has NOT been submitted.

Respond with ONLY a JSON object, no prose, no markdown fences:
{
  "missing": [
    {"item": "short name of missing evidence", "priority": "low"|"medium"|"high"}
  ]
}
Only list items genuinely relevant to this incident type. Return an empty
list if the evidence submitted looks sufficient.
"""


def run(claim, evidence_summary):
    """evidence_summary: dict like {'documents': [...names...], 'images': n, 'audio': bool}"""
    from llm.client import LLMClient
    import streamlit as st

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    user_prompt = f"""Incident type: {claim.get('incident_type')}
Evidence submitted:
- Documents: {evidence_summary.get('documents') or 'none'}
- Damage images: {evidence_summary.get('images', 0)}
- Audio statement: {'yes' if evidence_summary.get('audio') else 'no'}
"""

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, max_tokens=500, temperature=0.0)
        items = data.get("missing", [])
        # normalize
        clean = []
        for it in items:
            if isinstance(it, dict) and it.get("item"):
                clean.append({
                    "item": str(it["item"]),
                    "priority": str(it.get("priority", "medium")).lower(),
                })
        return {"status": "complete", "missing": clean}
    except LLMError as e:
        return {"status": "error", "missing": [], "error": str(e)}
    except (json.JSONDecodeError, ValueError) as e:
        return {"status": "error", "missing": [], "error": f"Invalid JSON from model: {e}"}
