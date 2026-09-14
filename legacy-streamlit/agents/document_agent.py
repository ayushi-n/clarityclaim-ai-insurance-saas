"""
Document Agent

Reads the claim form fields plus any uploaded document evidence (PDFs,
police reports, repair estimates, .docx, .txt) and produces a structured
summary: what happened, where the impact was, and what supporting facts
appear in the paperwork.

Confidence is NOT the number the LLM guesses about itself -- self-reported
LLM confidence swings wildly between runs on identical input, which is
exactly the "different result every time" problem this rewrite fixes.
Instead, confidence is computed deterministically in Python from the real,
measurable evidence the LLM extracted: how much documentation exists, how
many concrete facts were pulled out of it, and whether key questions
(impact location, policy status) could actually be answered from the text.
The same evidence text will always produce the same confidence score.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You are the Document Agent inside ClarityClaim, an insurance
claims intelligence system. You analyze claim forms and written evidence
(police reports, repair estimates, statements) for a single claim.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this
exact shape:
{
  "summary": "2-3 sentence plain-language summary of what the documents say happened",
  "impact_location": one of ["front","rear","side","rollover","multiple","unknown"],
  "key_facts": ["short factual bullet", "..."],
  "policy_appears_active": true|false|null,
  "confidence": integer 0-100 (how confident you are in this reading of the documents)
}
Base impact_location strictly on what the text evidence states. If the
documents don't mention the impact location, use "unknown". Do not invent
facts that are not present in the provided text.
"""


def _evidence_confidence(document_texts, data):
    """Deterministic confidence, grounded in real evidence signals rather
    than the model's own self-reported number:
      - how much documentation was actually supplied (count + total length)
      - how many concrete facts the extraction found
      - whether the impact location and policy status could be determined
    Same inputs -> same score, every time."""
    total_chars = sum(len(text or "") for _, text in document_texts)
    doc_count = len(document_texts)
    key_facts = data.get("key_facts") or []
    if not isinstance(key_facts, list):
        key_facts = []

    if doc_count == 0:
        base = 20.0  # only the claim form narrative to go on -- weak evidence
    else:
        base = 40.0 + min(20.0, total_chars / 400.0)

    facts_score = min(20.0, 5.0 * len(key_facts))
    location_score = 10.0 if data.get("impact_location") not in (None, "unknown") else 0.0
    policy_score = 10.0 if data.get("policy_appears_active") is not None else 0.0

    score = base + facts_score + location_score + policy_score
    return round(max(0.0, min(100.0, score)), 1)


def run(claim, document_texts):
    """
    claim: dict with claim_id, claimant_name, incident_type, incident_description
    document_texts: list of (filename, extracted_text) tuples
    """
    from llm.client import LLMClient
    import streamlit as st

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    docs_blob = "\n\n".join(
        f"--- {name} ---\n{text[:6000]}" for name, text in document_texts
    ) or "(no supporting documents uploaded)"

    user_prompt = f"""CLAIM FORM
Claim ID: {claim.get('claim_id')}
Claimant: {claim.get('claimant_name')}
Incident type: {claim.get('incident_type')}
Incident description (as entered by claimant/adjuster):
{claim.get('incident_description') or '(none provided)'}

SUPPORTING DOCUMENTS
{docs_blob}
"""

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.0)
        confidence = _evidence_confidence(document_texts, data)
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
