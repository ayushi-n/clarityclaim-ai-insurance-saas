"""
Decision Router

Purely deterministic -- takes the joint confidence, the adjudicator's
approve/reject recommendation, and whether unresolved contradictions exist,
and applies the thresholds configured on the Settings page. No LLM call
here: routing must be auditable and reproducible from the numbers already
on screen.

Routing rules (final `routing` value is one of "auto_approve" / "human_review"):
  1. Confidence below the human-review threshold (~75-80%) -> always
     human_review. No exceptions.
  2. A blocking (high/critical) unresolved contradiction -> always
     human_review, regardless of confidence.
  3. The AI recommends REJECTING the claim -> always human_review, even at
     high confidence. Rejections are never fully automated -- they always
     need a human reviewer to confirm before the claim is actually denied.
  4. Otherwise (confidence >= the auto-approval threshold, ~80%+, AI
     recommends approval, no blocking contradiction) -> auto_approve. This
     is the ONLY path that skips human review, so human_review is never
     selected for every claim regardless of confidence.
  5. Anything in between (confidence between the review and auto-approval
     thresholds, recommendation is approve) -> human_review, since it isn't
     "strong" enough to auto-approve outright.
"""


def route(joint_confidence, recommendation, contradictions, settings):
    blocks_auto = settings.get("contradiction_blocks_auto", True)
    has_blocking_contradiction = blocks_auto and any(
        c.get("severity") in ("high", "critical") for c in contradictions
    )

    auto_thresh = settings.get("confidence_auto_approve", 80.0)
    review_thresh = settings.get("confidence_human_review", 75.0)

    required_actions = []

    if joint_confidence < review_thresh:
        routing = "human_review"
        required_actions.append(
            f"Confidence ({joint_confidence:.0f}%) is below the human-review "
            f"threshold ({review_thresh:.0f}%) — a reviewer must evaluate this claim."
        )
    elif recommendation == "reject":
        routing = "human_review"
        required_actions.append(
            "The AI recommends REJECTING this claim — all rejections require a "
            "human reviewer to confirm before the claim is denied."
        )
    elif has_blocking_contradiction:
        routing = "human_review"
        required_actions.append("Resolve the flagged contradiction before approval.")
    elif joint_confidence >= auto_thresh:
        routing = "auto_approve"
    else:
        routing = "human_review"
        required_actions.append(
            f"Confidence ({joint_confidence:.0f}%) is below the auto-approval "
            f"threshold ({auto_thresh:.0f}%) — a reviewer must confirm before approval."
        )

    if any(c.get("severity") == "critical" for c in contradictions):
        required_actions.append("Independent verification of conflicting evidence.")

    return routing, required_actions
