"""
Human Reviews -- reached from the profile dropdown (components/header.py),
not the main sidebar. Shows every claim actually routed to human_review by
the pipeline (agents/pipeline.py), with the AI's recommendation front and
center -- especially claims the AI recommended REJECTING, since those can
never be auto-finalized (see agents/router.py). A reviewer opens a claim,
reads the same evidence trace as the rest of the app, and records a real
completed review (approve/reject + notes), which is persisted to the
human_reviews table and immediately reflected in Overview/Reports.
"""
import datetime

import streamlit as st

import auth
import db
from components.header import render_header

render_header(
    title="Human Reviews",
    subtitle="Claims routed to human review by the AI pipeline — including every "
              "AI-recommended rejection, which always requires a human sign-off "
              "before it becomes final.",
)

user = auth.current_user()
reviewer_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() if user else "Reviewer"

tab_pending, tab_completed = st.tabs(["Pending", "Completed"])

REC_BADGE = {"approve": "cc-badge-sage", "reject": "cc-badge-danger"}


def _claim_context(claim_row_id):
    claim = db.get_claim(claim_row_id)
    decision = db.get_decision(claim_row_id)
    findings = db.get_agent_findings(claim_row_id)
    contradictions = db.get_contradictions(claim_row_id)
    missing_items = db.get_missing_evidence(claim_row_id)
    return claim, decision, findings, contradictions, missing_items


def _render_review_card(review, completed=False):
    claim, decision, findings, contradictions, missing_items = _claim_context(review["claim_id"])
    if not claim:
        return

    rec = (review.get("ai_recommendation") or "approve").lower()
    rec_label = "AI RECOMMENDS: REJECT" if rec == "reject" else "AI RECOMMENDS: APPROVE"

    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    top = st.columns([3, 2, 2])
    top[0].markdown(f"**{claim['claim_id']}** — {claim.get('claimant_name') or '—'}")
    top[1].markdown(f'<span class="cc-badge {REC_BADGE.get(rec, "cc-badge-tan")}">{rec_label}</span>',
                     unsafe_allow_html=True)
    if decision:
        top[2].markdown(f"Confidence **{decision['confidence']:.0f}%** · Severity **{decision['severity']}**")

    st.caption(f"{claim.get('incident_type') or '—'} · submitted "
               f"{datetime.datetime.fromtimestamp(claim['created_at']).strftime('%b %d, %Y')}")

    with st.expander("Review evidence", expanded=False):
        if decision:
            st.markdown(f"**Rationale:** {decision['rationale']}")
        completed_findings = [f for f in findings if f["status"] == "complete"]
        if completed_findings:
            st.markdown("**Agent findings**")
            for f in completed_findings:
                st.write(f"- {f['agent_name']} ({f['confidence']:.0f}%): {f['summary']}")
        if contradictions:
            st.markdown("**Contradictions**")
            for c in contradictions:
                st.write(f"- **{c['severity'].upper()}** — {c['description']}")
        if missing_items:
            st.markdown("**Missing evidence**")
            for m in missing_items:
                st.write(f"- {m['item']} ({m['priority']})")
        b1, b2 = st.columns(2)
        with b1:
            if st.button("Open Evidence Analysis →", key=f"open_ea_{review['id']}", width="stretch"):
                st.session_state.active_claim_row_id = claim["id"]
                st.switch_page("views/evidence_analysis.py")
        with b2:
            if st.button("Open Decision & Routing →", key=f"open_dr_{review['id']}", width="stretch"):
                st.session_state.active_claim_row_id = claim["id"]
                st.switch_page("views/decision_routing.py")

    if completed:
        final = review.get("final_decision", "—")
        final_badge = REC_BADGE.get(final, "cc-badge-tan")
        st.markdown(
            f'<span class="cc-badge {final_badge}">FINAL: {str(final).upper()}</span> '
            f'<span style="margin-left:8px;font-size:12.5px;color:var(--cc-muted, inherit);">'
            f'reviewed by {review.get("reviewer_name") or "—"} on '
            f'{datetime.datetime.fromtimestamp(review["reviewed_at"]).strftime("%b %d, %Y · %H:%M") if review.get("reviewed_at") else "—"}'
            f'</span>',
            unsafe_allow_html=True,
        )
        if review.get("notes"):
            st.caption(f"Notes: {review['notes']}")
    else:
        with st.form(key=f"review_form_{review['id']}"):
            st.markdown("**Record your review**")
            final_decision = st.radio(
                "Final decision", ["approve", "reject"],
                index=0 if rec == "approve" else 1,
                key=f"final_decision_{review['id']}", horizontal=True,
            )
            notes = st.text_area("Reviewer notes", key=f"notes_{review['id']}", height=80,
                                  placeholder="Document what you checked and why.")
            submitted = st.form_submit_button("Complete Review")
        if submitted:
            db.complete_human_review(review["id"], final_decision, reviewer_name, notes)
            db.create_notification(
                "review_completed",
                f"Human review completed for {claim['claim_id']}",
                f"{reviewer_name} recorded a final decision of "
                f"{final_decision.upper()}.",
                claim_row_id=claim["id"],
            )
            st.success(f"Review recorded — {claim['claim_id']} marked {final_decision.upper()}.")
            st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)


with tab_pending:
    pending = db.list_human_reviews(status="pending")
    if not pending:
        st.info("No claims are currently waiting for human review.")
    else:
        rejects = [r for r in pending if (r.get("ai_recommendation") or "").lower() == "reject"]
        st.caption(f"{len(pending)} claim(s) pending · {len(rejects)} AI-recommended rejection(s)")
        for review in pending:
            _render_review_card(review, completed=False)

with tab_completed:
    completed = db.list_human_reviews(status="completed")
    if not completed:
        st.info("No reviews have been completed yet.")
    else:
        st.caption(f"{len(completed)} review(s) completed")
        for review in completed:
            _render_review_card(review, completed=True)
