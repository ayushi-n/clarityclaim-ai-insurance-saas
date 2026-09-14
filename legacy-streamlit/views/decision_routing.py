import datetime

import streamlit as st

import db
from components.header import render_header
from utils.claim_picker import pick_claim

render_header(title="Decision & Routing")

claim = pick_claim()
if not claim:
    st.stop()

st.caption(f"Final adjudication output with full explainability trace for {claim['claim_id']}.")

decision = db.get_decision(claim["id"])
if not decision:
    st.warning("This claim hasn't been through the pipeline yet.")
    st.stop()

contradictions = db.get_contradictions(claim["id"])
findings = db.get_agent_findings(claim["id"])
missing_items = db.get_missing_evidence(claim["id"])

ROUTING_LABEL = {
    "auto_approve": "AUTO-APPROVED",
    "human_review": "HUMAN REVIEW",
}
ROUTING_EST = {
    "auto_approve": "Instant",
    "human_review": "2–4 hours",
}
SEV_COLOR = {"HIGH": "#632024", "MEDIUM": "#6F4D38", "LOW": "#617891"}
REC_LABEL = {"approve": "AI RECOMMENDS: APPROVE", "reject": "AI RECOMMENDS: REJECT"}
REC_BADGE = {"approve": "cc-badge-sage", "reject": "cc-badge-danger"}
routing_badge_class = "cc-badge-sage" if decision["routing"] == "auto_approve" else "cc-badge-tan"

st.markdown(f"""
<div class="cc-card" style="background:linear-gradient(135deg,#D5B89340,#FFFFFF);">
<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:24px;">
  <div>
    <div class="cc-label">ADJUDICATION DECISION</div>
    <div style="display:flex;align-items:baseline;gap:18px;margin-top:6px;">
      <span style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;
            color:{SEV_COLOR.get(decision['severity'], '#25344F')};">{decision['severity']}</span>
      <span style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;">
            {decision['confidence']:.0f}%</span>
      <span class="cc-badge {routing_badge_class}">{ROUTING_LABEL.get(decision['routing'], decision['routing'])}</span>
      {f'<span class="cc-badge {REC_BADGE.get(decision["recommended_decision"], "cc-badge-tan")}">{REC_LABEL.get(decision["recommended_decision"], "")}</span>' if decision.get('recommended_decision') else ''}
    </div>
    <div style="color:#25344F99;font-size:12.5px;margin-top:4px;">SEVERITY &nbsp;·&nbsp; JOINT CONFIDENCE &nbsp;·&nbsp; ROUTING DECISION</div>
  </div>
  <div style="text-align:right;">
    <div class="cc-label">ASSIGNED TO</div>
    <div style="font-weight:700;font-size:16px;">Claims Review Queue</div>
    <div style="color:#25344F99;font-size:12.5px;">Est. review time: {ROUTING_EST.get(decision['routing'], '—')}</div>
  </div>
</div>
<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
  <span class="cc-badge cc-badge-tan">{claim['claim_id']}</span>
  <span class="cc-badge cc-badge-tan">{claim['incident_type'].upper()}</span>
  {'<span class="cc-badge cc-badge-danger">CONTRADICTION DETECTED</span>' if contradictions else ''}
  <span class="cc-badge cc-badge-tan">{datetime.datetime.fromtimestamp(decision['created_at']).strftime('%b %d, %Y · %H:%M')}</span>
</div>
</div>
""", unsafe_allow_html=True)

if decision["routing"] == "human_review":
    review = db.get_latest_human_review(claim["id"])
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Human Review Status")
    if review and review["status"] == "completed":
        final_badge = REC_BADGE.get(review.get("final_decision"), "cc-badge-tan")
        st.markdown(
            f'<span class="cc-badge {final_badge}">FINAL: {str(review.get("final_decision")).upper()}</span> '
            f'&nbsp;reviewed by **{review.get("reviewer_name") or "—"}** on '
            f'{datetime.datetime.fromtimestamp(review["reviewed_at"]).strftime("%b %d, %Y · %H:%M") if review.get("reviewed_at") else "—"}',
            unsafe_allow_html=True,
        )
        if review.get("notes"):
            st.caption(f"Notes: {review['notes']}")
    else:
        st.warning("This claim is waiting in the Human Review queue "
                   "(open it via the profile menu → Human Reviews to complete the review).")
        if st.button("Open in Human Reviews →", key="open_human_reviews"):
            st.switch_page("views/human_reviews.py")
    st.markdown('</div>', unsafe_allow_html=True)

left, right = st.columns([3, 2])

with left:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Explainable Decision")
    st.caption("AI-generated rationale for routing outcome")
    st.markdown(f"""
    <div style="border-left:3px solid #6F4D38;padding:10px 16px;background:#6F4D3812;
         border-radius:0 8px 8px 0;font-style:italic;">
    "{decision['rationale']}"
    </div>
    """, unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    with st.expander("Evidence Traceability", expanded=False):
        st.markdown(f"**Final Decision** — {ROUTING_LABEL.get(decision['routing'])} · "
                    f"Severity: {decision['severity']} · Confidence: {decision['confidence']:.0f}%")
        st.markdown(f"**Adjudicator** — Synthesized {len([f for f in findings if f['status']=='complete'])} "
                    f"agent output(s).")
        debate = db.get_debate_log(claim["id"])
        if debate:
            st.markdown(f"**Multi-Agent Debate** — {len(set(t['round'] for t in debate))} "
                        f"round(s) completed.")
        if contradictions:
            st.markdown(f"**Contradiction Engine** — {len(contradictions)} conflict(s) detected.")
        agent_line = ", ".join(
            f"{f['agent_name']}: {f['impact_location']} ({f['confidence']:.0f}%)"
            for f in findings if f["status"] == "complete"
        )
        st.markdown(f"**Agent Findings** — {agent_line or 'none'}.")
        evidence = db.get_evidence(claim["id"])
        st.markdown(f"**Original Evidence** — {len(evidence)} file(s): "
                    f"{', '.join(e['filename'] for e in evidence) or 'none'}.")

with right:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Required Actions")
    if decision["required_actions"]:
        for a in decision["required_actions"]:
            st.checkbox(a, key=f"action_{a}")
    else:
        st.write("No further action required.")
    st.markdown('</div>', unsafe_allow_html=True)

    if missing_items:
        st.markdown('<div class="cc-card">', unsafe_allow_html=True)
        st.markdown("#### Outstanding Evidence")
        for m in missing_items:
            st.write(f"☐ **{m['item']}** ({m['priority']})")
        st.markdown('</div>', unsafe_allow_html=True)
