"""
Contradiction Engine

Compares the completed agents' findings against each other and flags
genuine conflicts (e.g. Document Agent says rear impact, Vision Agent says
front impact). A simple rule-based pass catches direct impact-location
mismatches; an LLM pass catches subtler narrative contradictions across the
free-text summaries.
"""
import json

from llm.client import LLMError

SYSTEM_PROMPT = """You are the Contradiction Engine inside ClarityClaim, an
insurance claims intelligence system. You are given the findings of several
independent agents that each analyzed different evidence for the same
claim. Identify genuine contradictions between them — places where the
evidence sources cannot both be true simultaneously.

Respond with ONLY a JSON object, no prose, no markdown fences:
{
  "contradictions": [
    {
      "description": "one sentence describing the specific conflict",
      "agents_involved": ["Document Agent", "Vision Agent"],
      "severity": "low"|"medium"|"high"|"critical"
    }
  ]
}
Only report real, specific contradictions grounded in the given findings.
Do not report a contradiction just because two agents have different
confidence scores. Return an empty list if the findings are consistent.
"""


def _location_mismatch(findings):
    """Deterministic first pass: compare stated impact_location fields."""
    located = [(f["agent_name"], f["impact_location"]) for f in findings
               if f["status"] == "complete" and f.get("impact_location")
               and f["impact_location"] not in ("unknown", "multiple")]
    conflicts = []
    for i in range(len(located)):
        for j in range(i + 1, len(located)):
            a_name, a_loc = located[i]
            b_name, b_loc = located[j]
            if a_loc != b_loc:
                conflicts.append({
                    "description": f"{a_name} indicates {a_loc}-impact damage while "
                                    f"{b_name} indicates {b_loc}-impact damage.",
                    "agents_involved": [a_name, b_name],
                    "severity": "critical",
                })
    return conflicts


def run(claim, findings):
    """findings: list of dicts from db.get_agent_findings-style records with
    keys agent_name, status, summary, impact_location, confidence."""
    from llm.client import LLMClient
    import streamlit as st

    rule_based = _location_mismatch(findings)

    completed = [f for f in findings if f["status"] == "complete"]
    if len(completed) < 2:
        return {"status": "complete", "contradictions": rule_based}

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    findings_blob = "\n".join(
        f"- {f['agent_name']} (confidence {f['confidence']:.0f}%): {f['summary']}"
        for f in completed
    )
    user_prompt = f"Claim {claim.get('claim_id')} — {claim.get('incident_type')}.\n\nAGENT FINDINGS:\n{findings_blob}"

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, max_tokens=600, temperature=0.0)
        llm_conflicts = data.get("contradictions", [])
        clean = []
        for c in llm_conflicts:
            if isinstance(c, dict) and c.get("description"):
                clean.append({
                    "description": str(c["description"]),
                    "agents_involved": c.get("agents_involved", []),
                    "severity": str(c.get("severity", "medium")).lower(),
                })
        # de-duplicate against rule-based list (avoid double-reporting the same
        # location mismatch)
        merged = list(rule_based)
        existing_desc = {c["description"] for c in merged}
        for c in clean:
            if c["description"] not in existing_desc:
                merged.append(c)
        return {"status": "complete", "contradictions": merged}
    except LLMError as e:
        # Still return the deterministic findings even if the LLM pass failed.
        return {"status": "partial", "contradictions": rule_based, "error": str(e)}
    except (json.JSONDecodeError, ValueError) as e:
        return {"status": "partial", "contradictions": rule_based, "error": str(e)}
