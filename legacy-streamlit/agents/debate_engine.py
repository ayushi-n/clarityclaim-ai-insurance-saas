"""
Multi-Agent Debate

Round 1 is deterministic: every completed agent's own finding becomes its
opening argument, and its stance ("supports" vs "disputes") is set by
whether its stated impact_location agrees with the majority reading across
agents. Its weight is its own confidence score — real numbers already
produced by that agent, never invented here.

Round 2 only runs when there is an actual disagreement to debate: the LLM is
asked, once, to write a short rebuttal for each disputing agent and a short
reinforcing point for each supporting agent, grounded in the round-1
arguments already on the table.
"""
import json
from collections import Counter

from llm.client import LLMError

SYSTEM_PROMPT = """You are moderating a debate between AI claims-analysis
agents that disagree about a detail of an insurance claim. You are given
each agent's opening argument. Write one short second-round line per agent:
if their stance is "disputes", write a pointed rebuttal defending their
reading of the evidence against the majority view; if their stance is
"supports", write a short line reinforcing why the majority reading holds.

Respond with ONLY a JSON object, no prose, no markdown fences:
{
  "turns": [ {"agent_name": "...", "argument": "one or two sentences"} ]
}
"""


def run(claim, findings):
    completed = [f for f in findings if f["status"] == "complete"]
    if not completed:
        return []

    locations = [f["impact_location"] for f in completed if f.get("impact_location") not in (None, "unknown")]
    majority_location = Counter(locations).most_common(1)[0][0] if locations else None

    turns = []
    round1 = []
    for f in completed:
        loc = f.get("impact_location")
        if majority_location and loc not in (None, "unknown") and loc != majority_location:
            stance = "disputes"
        else:
            stance = "supports"
        turn = {
            "round": 1,
            "agent_name": f["agent_name"],
            "stance": stance,
            "argument": f.get("summary", ""),
            "weight": float(f.get("confidence", 0)),
        }
        turns.append(turn)
        round1.append(turn)

    disputing = [t for t in round1 if t["stance"] == "disputes"]
    if not disputing:
        return turns  # nothing to debate — evidence agrees

    from llm.client import LLMClient
    import streamlit as st

    mode = st.session_state.get("llm_mode", "local")
    client = LLMClient(mode=mode)

    arguments_blob = "\n".join(
        f"- {t['agent_name']} [{t['stance']}, weight {t['weight']:.0f}%]: {t['argument']}"
        for t in round1
    )
    user_prompt = f"Claim {claim.get('claim_id')} — {claim.get('incident_type')}.\n\nROUND 1 ARGUMENTS:\n{arguments_blob}"

    try:
        data, raw = client.chat_json(SYSTEM_PROMPT, user_prompt, max_tokens=600, temperature=0.0)
        by_agent = {t["agent_name"]: t for t in round1}
        for turn_data in data.get("turns", []):
            name = turn_data.get("agent_name")
            if name in by_agent:
                turns.append({
                    "round": 2,
                    "agent_name": name,
                    "stance": by_agent[name]["stance"],
                    "argument": str(turn_data.get("argument", "")),
                    "weight": by_agent[name]["weight"],
                })
    except LLMError:
        pass  # round 2 is optional color; round 1 already carries the real signal
    except (json.JSONDecodeError, ValueError):
        pass

    return turns
