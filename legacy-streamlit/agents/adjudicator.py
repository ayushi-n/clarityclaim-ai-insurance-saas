"""
Adjudicator

Combines everything upstream agents produced into the numbers the router
can act on: a severity rating, a joint confidence score, and a recommended
decision (approve/reject). The confidence math and the recommendation are
both fully deterministic and auditable -- built from real agent confidences,
real contradictions, real missing-evidence findings, and real structured
fields the Document Agent extracted (e.g. whether the policy appears
active) -- never invented or randomly varied. Severity classification does
use the LLM, since it requires judgment about the incident narrative -- but
it's a single transparent call at temperature 0, and if it fails we fall
back to a clear rule instead of guessing.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You are the Adjudicator inside ClarityClaim, an insurance
claims intelligence system. Based on the claim details and agent findings,
classify the overall severity of this claim.

Respond with ONLY a JSON object, no prose, no markdown fences:
{"severity": "LOW"|"MEDIUM"|"HIGH", "reason": "one sentence justification"}

HIGH: significant injury risk, major property damage, total loss, or high
estimated payout. MEDIUM: moderate, clearly bounded damage. LOW: minor,
low-cost, low-ambiguity claims.
"""

SEVERITY_WEIGHT = {"low": 0.0, "medium": 0.15, "high": 0.30, "critical": 0.50}
PRIORITY_PENALTY = {"low": 1, "medium": 3, "high": 6}

# Confidence floor below which the evidence is too thin to support any
# automated recommendation at all -- the claim is recommended for rejection
# not because anything is necessarily wrong with it, but because there is
# not enough real evidence on record to justify approval.
MIN_CONFIDENCE_FOR_APPROVAL = 40.0


def _confidence_math(findings, contradictions, missing_items):
    completed = [f for f in findings if f["status"] == "complete"]
    if not completed:
        return 0.0
    base = sum(f["confidence"] for f in completed) / len(completed)

    # Contradiction penalty: driven by the single most severe conflict, with a
    # small additional penalty per extra conflict (diminishing returns, capped)
    # rather than summing every pairwise conflict -- several agents disagreeing
    # about the same underlying fact should not multiply the penalty once per
    # pair. Capped at 60 points so one bad conflict never single-handedly
    # zeroes out otherwise-strong evidence.
    contradiction_penalty = 0.0
    if contradictions:
        worst = max(SEVERITY_WEIGHT.get(c.get("severity", "medium"), 0.15) for c in contradictions)
        contradiction_penalty = min(60.0, worst * 100 + 8 * (len(contradictions) - 1))

    missing_penalty = min(20.0, sum(
        PRIORITY_PENALTY.get(m.get("priority", "medium"), 3) for m in missing_items
    ))

    joint = max(0.0, min(100.0, base - contradiction_penalty - missing_penalty))
    return round(joint, 1)


def _recommendation(findings, contradictions, missing_items, joint_confidence):
    """Deterministic approve/reject recommendation, grounded only in real
    evidence already produced upstream:
      - the Document Agent's own structured reading of whether the policy
        appears to have been active (policy_appears_active: true/false/null)
      - any critical, unresolved contradiction between evidence sources
      - whether any evidence agent completed at all
      - whether the resulting joint confidence clears a minimum evidence bar
    Never a coin flip, never influenced by randomness -- the same evidence
    trace always yields the same recommendation and the same reasons."""
    completed = [f for f in findings if f["status"] == "complete"]
    reasons = []
    reject = False

    if not completed:
        reject = True
        reasons.append("No agent evidence could be analyzed for this claim.")

    doc_finding = next((f for f in completed if f["agent_name"] == "Document Agent"), None)
    if doc_finding and doc_finding.get("raw", {}).get("policy_appears_active") is False:
        reject = True
        reasons.append("Document evidence indicates the policy may not have been "
                        "active at the time of loss.")

    if any(c.get("severity") == "critical" for c in contradictions):
        reject = True
        reasons.append("A critical, unresolved contradiction exists between "
                        "independent evidence sources.")

    if joint_confidence < MIN_CONFIDENCE_FOR_APPROVAL:
        reject = True
        reasons.append(f"Joint confidence ({joint_confidence:.0f}%) is below the "
                        f"minimum evidence bar for approval ({MIN_CONFIDENCE_FOR_APPROVAL:.0f}%).")

    high_priority_missing = [m for m in missing_items if m.get("priority") == "high"]
    if len(high_priority_missing) >= 2:
        reject = True
        reasons.append(f"{len(high_priority_missing)} high-priority item(s) of "
                        f"required evidence are missing.")

    recommendation = "reject" if reject else "approve"
    return recommendation, reasons


def run(claim, findings, contradictions, missing_items):
    from llm.client import LLMClient
    import streamlit as st

    joint_confidence = _confidence_math(findings, contradictions, missing_items)
    recommendation, recommendation_reasons = _recommendation(
        findings, contradictions, missing_items, joint_confidence
    )

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    findings_blob = "\n".join(
        f"- {f['agent_name']}: {f['summary']}" for f in findings if f["status"] == "complete"
    ) or "(no completed agent findings)"
    contradiction_blob = "\n".join(f"- {c['description']}" for c in contradictions) or "none"

    user_prompt = f"""Claim {claim.get('claim_id')} — {claim.get('incident_type')}
Description: {claim.get('incident_description') or '(none)'}

AGENT FINDINGS:
{findings_blob}

CONTRADICTIONS:
{contradiction_blob}
"""

    severity = "MEDIUM"
    reason = "Default classification — severity model unavailable."
    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, max_tokens=300, temperature=0.0)
        sev = str(data.get("severity", "MEDIUM")).upper()
        if sev in ("LOW", "MEDIUM", "HIGH"):
            severity = sev
        reason = str(data.get("reason", reason))
        status = "complete"
    except LLMError as e:
        status = "error"
        reason = f"Severity model unavailable ({e}); defaulted to MEDIUM pending human review."
    except (json.JSONDecodeError, ValueError) as e:
        status = "error"
        reason = f"Severity model returned invalid output ({e}); defaulted to MEDIUM."

    # Any critical contradiction should never be silently rated LOW severity.
    if any(c.get("severity") == "critical" for c in contradictions) and severity == "LOW":
        severity = "MEDIUM"

    return {
        "status": status,
        "severity": severity,
        "severity_reason": reason,
        "joint_confidence": joint_confidence,
        "recommendation": recommendation,
        "recommendation_reasons": recommendation_reasons,
    }
