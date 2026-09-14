"""
Explainable AI Layer

Turns the full evidence trace (agent findings, contradictions, missing
evidence, adjudication) into a short human-readable rationale an adjuster
can read in seconds. This is presentation, not decision-making — the
routing decision itself is computed deterministically in router.py.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You write short, plain-English rationales for insurance
claim routing decisions, for a senior claims adjuster to read. Given the
evidence trace, write a rationale of 2-4 sentences explaining WHY the claim
received this routing decision. Reference specific evidence. Do not repeat
raw numbers that are already shown elsewhere in the UI; focus on the
reasoning.

Respond with ONLY a JSON object, no prose, no markdown fences:
{"rationale": "2-4 sentence explanation"}
"""


def run(claim, findings, contradictions, missing_items, severity, joint_confidence, routing):
    from llm.client import LLMClient
    import streamlit as st

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    findings_blob = "\n".join(
        f"- {f['agent_name']} ({f['confidence']:.0f}%): {f['summary']}"
        for f in findings if f["status"] == "complete"
    ) or "(no completed findings)"
    contradiction_blob = "\n".join(f"- {c['description']}" for c in contradictions) or "none"
    missing_blob = ", ".join(m["item"] for m in missing_items) or "none"

    user_prompt = f"""Claim {claim.get('claim_id')} — {claim.get('incident_type')}
Severity: {severity} | Joint confidence: {joint_confidence}% | Routing: {routing}

FINDINGS:
{findings_blob}

CONTRADICTIONS:
{contradiction_blob}

MISSING EVIDENCE:
{missing_blob}
"""

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, max_tokens=300, temperature=0.0)
        rationale = data.get("rationale", "").strip()
        if rationale:
            return rationale
    except LLMError:
        pass
    except (json.JSONDecodeError, ValueError):
        pass

    # Deterministic fallback so the UI never shows a blank rationale.
    parts = [f"Joint confidence of {joint_confidence}% with {severity.lower()} severity."]
    if contradictions:
        parts.append(f"{len(contradictions)} contradiction(s) were detected across agent evidence.")
    if missing_items:
        parts.append(f"{len(missing_items)} item(s) of typically-required evidence are missing.")
    parts.append(f"Routed to {routing.replace('_', ' ')} based on configured confidence thresholds.")
    return " ".join(parts)
