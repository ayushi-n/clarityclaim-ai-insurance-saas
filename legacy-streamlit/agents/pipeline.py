"""
Pipeline orchestrator.

Runs Document Agent -> Vision Agent -> Audio Agent -> Missing Evidence Agent
-> Contradiction Engine -> Multi-Agent Debate -> Adjudicator -> Explainable
AI -> Router, persisting every intermediate result to SQLite so every other
page can read the same real trace. Also creates the real, event-driven
notification and human-review-queue records the rest of the UI reads from
-- nothing about a claim's outcome is fabricated after the fact.
"""
import db
from agents import (adjudicator, audio_agent, contradiction_engine,
                     debate_engine, document_agent, explainability,
                     missing_evidence_agent, router, vision_agent)


def run_pipeline(claim_row_id, progress_cb=None):
    """progress_cb(step_name, fraction_done) is called after each stage, if given."""

    def tick(name, frac):
        if progress_cb:
            progress_cb(name, frac)

    claim = db.get_claim(claim_row_id)
    settings = db.get_settings()
    db.clear_pipeline_outputs(claim_row_id)

    documents = db.get_evidence(claim_row_id, "document")
    images = db.get_evidence(claim_row_id, "image")
    transcripts = db.get_evidence(claim_row_id, "transcript")

    findings = []

    # -- Document Agent -----------------------------------------------
    if settings.get("document_agent_enabled", True):
        tick("Document Agent", 0.10)
        doc_texts = [(d["filename"], d["extracted_text"] or "") for d in documents]
        result = document_agent.run(claim, doc_texts)
    else:
        result = {"status": "skipped", "summary": "Document Agent disabled in Settings.",
                   "impact_location": "unknown", "confidence": 0.0, "raw": {}}
    db.save_agent_finding(claim_row_id, "Document Agent", result["status"], result["summary"],
                           result["impact_location"], result["confidence"], result["raw"])
    findings.append({"agent_name": "Document Agent", **result})

    # -- Vision Agent ---------------------------------------------------
    if settings.get("vision_agent_enabled", True):
        tick("Vision Agent", 0.25)
        image_paths = [i["filepath"] for i in images]
        result = vision_agent.run(claim, image_paths)
    else:
        result = {"status": "skipped", "summary": "Vision Agent disabled in Settings.",
                   "impact_location": "unknown", "confidence": 0.0, "raw": {}}
    db.save_agent_finding(claim_row_id, "Vision Agent", result["status"], result["summary"],
                           result["impact_location"], result["confidence"], result["raw"])
    findings.append({"agent_name": "Vision Agent", **result})

    # -- Audio Agent ------------------------------------------------------
    if settings.get("audio_agent_enabled", True):
        tick("Audio Agent", 0.40)
        transcript_text = "\n".join(t["extracted_text"] or "" for t in transcripts)
        result = audio_agent.run(claim, transcript_text)
    else:
        result = {"status": "skipped", "summary": "Audio Agent disabled in Settings.",
                   "impact_location": "unknown", "confidence": 0.0, "raw": {}}
    db.save_agent_finding(claim_row_id, "Audio Agent", result["status"], result["summary"],
                           result["impact_location"], result["confidence"], result["raw"])
    findings.append({"agent_name": "Audio Agent", **result})

    # -- Missing Evidence Agent -------------------------------------------
    tick("Missing Information Agent", 0.55)
    evidence_summary = {
        "documents": [d["filename"] for d in documents],
        "images": len(images),
        "audio": len(transcripts) > 0,
    }
    missing_result = missing_evidence_agent.run(claim, evidence_summary)
    missing_items = missing_result.get("missing", [])
    for m in missing_items:
        db.save_missing_evidence(claim_row_id, m["item"], m["priority"])

    # -- Contradiction Engine ----------------------------------------------
    tick("Contradiction Engine", 0.68)
    contradiction_result = contradiction_engine.run(claim, findings)
    contradictions = contradiction_result.get("contradictions", [])
    for c in contradictions:
        db.save_contradiction(claim_row_id, c["description"], c.get("agents_involved", []),
                               c.get("severity", "medium"))

    # -- Multi-Agent Debate --------------------------------------------------
    tick("Multi-Agent Debate", 0.80)
    debate_turns = debate_engine.run(claim, findings)
    for t in debate_turns:
        db.save_debate_turn(claim_row_id, t["round"], t["agent_name"], t["stance"],
                             t["argument"], t["weight"])

    # -- Adjudicator -----------------------------------------------------------
    tick("Adjudicator", 0.90)
    adj = adjudicator.run(claim, findings, contradictions, missing_items)

    # -- Explainable AI + Router -------------------------------------------------
    tick("Explainable AI Layer", 0.95)
    routing, required_actions = router.route(
        adj["joint_confidence"], adj["recommendation"], contradictions, settings
    )
    rationale = explainability.run(claim, findings, contradictions, missing_items,
                                    adj["severity"], adj["joint_confidence"], routing)
    if adj["recommendation_reasons"]:
        rationale = rationale.rstrip(". ") + ". " + " ".join(adj["recommendation_reasons"])

    decision_id = db.save_decision(claim_row_id, adj["severity"], adj["joint_confidence"],
                                    routing, rationale, required_actions,
                                    recommended_decision=adj["recommendation"])
    db.update_claim_status(claim_row_id, "decided")

    # -- Real, event-driven human review queue + notifications ------------------
    claim_label = claim.get("claim_id", claim_row_id)
    if routing == "human_review":
        db.create_human_review(claim_row_id, decision_id, adj["recommendation"])
        db.create_notification(
            "human_review",
            f"Claim {claim_label} routed to Human Review",
            f"AI recommendation: {adj['recommendation'].upper()} · "
            f"confidence {adj['joint_confidence']:.0f}% · severity {adj['severity']}.",
            claim_row_id=claim_row_id,
        )
    else:
        db.create_notification(
            "auto_approved",
            f"Claim {claim_label} auto-approved",
            f"Confidence {adj['joint_confidence']:.0f}% cleared the auto-approval "
            f"threshold with no blocking contradictions.",
            claim_row_id=claim_row_id,
        )

    tick("Done", 1.0)
    return {
        "severity": adj["severity"],
        "joint_confidence": adj["joint_confidence"],
        "routing": routing,
        "recommendation": adj["recommendation"],
        "rationale": rationale,
        "contradictions": contradictions,
        "missing_items": missing_items,
    }
