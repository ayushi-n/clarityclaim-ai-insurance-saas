import streamlit as st

import db
from components.header import render_header

render_header(
    title="Claims Intelligence Center",
    subtitle="Analyze multimodal claim evidence, identify inconsistencies, and "
              "generate explainable routing decisions with multi-agent AI.",
)

stats = db.dashboard_stats()
claims = db.list_claims(limit=200)

# ---------------------------------------------------------------------------
# Metric cards
# ---------------------------------------------------------------------------
m1, m2, m3, m4 = st.columns(4)
metrics = [
    (m1, "CLAIMS ANALYZED", stats["claims_analyzed"], f"{len(claims)} total submitted"),
    (m2, "HIGH SEVERITY", stats["high_severity"], "Requires review"),
    (m3, "CONTRADICTIONS", stats["contradictions"], "Detected across all claims"),
    (m4, "HUMAN REVIEW", stats["human_review"], f"{stats['pending_human_review']} pending now"),
]
for col, label, value, sub in metrics:
    with col:
        st.markdown(f"""
        <div class="cc-card">
            <div class="cc-label">{label}</div>
            <div class="cc-metric">{value:,}</div>
            <div style="color:#25344F99;font-size:12.5px;margin-top:4px;">{sub}</div>
        </div>
        """, unsafe_allow_html=True)

m5, m6, m7 = st.columns(3)
metrics2 = [
    (m5, "APPROVED", stats["approved"], "Auto-approved + reviewer-approved"),
    (m6, "REJECTED", stats["rejected"], "Confirmed by human review"),
    (m7, "PENDING REVIEW", stats["pending_human_review"], "Awaiting a human reviewer"),
]
for col, label, value, sub in metrics2:
    with col:
        st.markdown(f"""
        <div class="cc-card">
            <div class="cc-label">{label}</div>
            <div class="cc-metric">{value:,}</div>
            <div style="color:#25344F99;font-size:12.5px;margin-top:4px;">{sub}</div>
        </div>
        """, unsafe_allow_html=True)

if not claims:
    st.info(
        "No claims yet. Submit your first claim on the **Claim Intake** page to "
        "see the multi-agent pipeline run end-to-end and populate these stats "
        "with real data."
    )

left, right = st.columns([3, 2])

# ---------------------------------------------------------------------------
# Recent claims
# ---------------------------------------------------------------------------
with left:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    hl, hr = st.columns([3, 1])
    with hl:
        st.markdown("### Recent Claims")
        st.caption(f"{len(claims)} claim(s) submitted")
    with hr:
        st.page_link("views/claim_intake.py", label="＋ New Claim", width="stretch")

    if claims:
        for c in claims[:6]:
            decision = db.get_decision(c["id"])
            sev = decision["severity"] if decision else "—"
            badge_class = {"HIGH": "cc-badge-danger", "MEDIUM": "cc-badge-tan",
                            "LOW": "cc-badge-sage"}.get(sev, "cc-badge-tan")
            cols = st.columns([2, 3, 3, 2])
            cols[0].markdown(f"**{c['claim_id']}**")
            cols[1].write(c["claimant_name"] or "—")
            cols[2].write(c["incident_type"] or "—")
            cols[3].markdown(f'<span class="cc-badge {badge_class}">{sev}</span>',
                              unsafe_allow_html=True)
    else:
        st.write("Nothing here yet.")
    st.markdown('</div>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Routing distribution
# ---------------------------------------------------------------------------
with right:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("### Routing Distribution")
    routing_labels = {
        "auto_approve": "Auto-Approved",
        "human_review": "Human Review",
    }
    total_decided = sum(stats["routing_counts"].values())
    if total_decided:
        for key, label in routing_labels.items():
            count = stats["routing_counts"].get(key, 0)
            pct = round(100 * count / total_decided) if total_decided else 0
            st.write(f"{label}")
            st.progress(pct / 100, text=f"{pct}% ({count})")
    else:
        st.write("No decisions recorded yet.")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("### Agent Activity")
    if stats["agent_counts"]:
        for agent, count in stats["agent_counts"].items():
            avg_conf = stats["agent_avg_conf"].get(agent, 0)
            st.write(f"{agent}")
            st.progress(min(avg_conf / 100, 1.0),
                        text=f"{count} claim(s) · avg confidence {avg_conf}%")
    else:
        st.write("No agent runs recorded yet.")
    st.markdown('</div>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Quick actions
# ---------------------------------------------------------------------------
st.write("")
q1, q2, q3 = st.columns(3)
with q1:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### 📄 Submit New Claim")
    st.write("Upload claim documents, images, and audio for AI analysis.")
    st.page_link("views/claim_intake.py", label="Open →")
    st.markdown('</div>', unsafe_allow_html=True)
with q2:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### 🔍 Review Evidence")
    st.write("Examine agent findings, contradictions, and confidence scores.")
    st.page_link("views/evidence_analysis.py", label="Open →")
    st.markdown('</div>', unsafe_allow_html=True)
with q3:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### 🧭 View Decisions")
    st.write("Inspect routing decisions with full explainability traces.")
    st.page_link("views/decision_routing.py", label="Open →")
    st.markdown('</div>', unsafe_allow_html=True)
