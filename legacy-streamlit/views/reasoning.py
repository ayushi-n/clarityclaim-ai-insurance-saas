import streamlit as st

import db
from components.header import render_header
from utils.claim_picker import pick_claim

render_header(
    title="Reasoning & Debate",
)

claim = pick_claim()
if not claim:
    st.stop()

st.caption(f"Multi-agent debate logs, contradiction analysis, and weighted argument "
           f"synthesis for {claim['claim_id']}.")

findings = db.get_agent_findings(claim["id"])
contradictions = db.get_contradictions(claim["id"])
debate = db.get_debate_log(claim["id"])
decision = db.get_decision(claim["id"])

if not findings:
    st.warning("This claim hasn't been through the pipeline yet.")
    st.stop()

left, right = st.columns([3, 2])

with left:
    sev = contradictions[0]["severity"].upper() if contradictions else "NONE"
    sev_class = {"CRITICAL": "cc-badge-danger", "HIGH": "cc-badge-danger",
                 "MEDIUM": "cc-badge-tan", "LOW": "cc-badge-sage",
                 "NONE": "cc-badge-sage"}.get(sev, "cc-badge-tan")
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    hdr_l, hdr_r = st.columns([3, 1])
    hdr_l.markdown("#### Contradiction Analysis")
    hdr_r.markdown(f'<span class="cc-badge {sev_class}">{sev}</span>', unsafe_allow_html=True)

    if contradictions:
        cols = st.columns(min(len(findings), 3))
        completed = [f for f in findings if f["status"] == "complete"]
        for i, f in enumerate(completed[:3]):
            with cols[i % len(cols)]:
                st.markdown(f"**{f['agent_name']}**  \n`{f['confidence']:.0f}%`")
                st.caption(f["summary"])
                if f.get("impact_location") and f["impact_location"] != "unknown":
                    st.markdown(f'<span class="cc-badge cc-badge-tan">{f["impact_location"].upper()} IMPACT</span>',
                                unsafe_allow_html=True)
        st.write("")
        for c in contradictions:
            st.error(f"**{', '.join(c['agents_involved'])}** — {c['description']}")
    else:
        st.success("No contradictions detected across agent findings.")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Multi-Agent Debate Log")
    rounds = sorted(set(t["round"] for t in debate))
    if debate:
        st.caption(f"{len(rounds)} round(s) · {len(debate)} argument(s) · "
                   f"{sum(1 for t in debate if t['stance'] == 'disputes')} dissenting position(s)")
        for t in debate:
            stance_label = "↑ SUPPORTS" if t["stance"] == "supports" else "↓ DISPUTES"
            stance_class = "cc-badge-sage" if t["stance"] == "supports" else "cc-badge-danger"
            st.markdown(f"""
            <div class="cc-card-flat">
                <span class="cc-badge {stance_class}">{stance_label}</span>
                <strong style="margin-left:6px;">{t['agent_name']}</strong>
                <span style="float:right;color:#25344F99;font-size:12px;">Round {t['round']} · Weight {t['weight']:.0f}%</span>
                <div style="margin-top:6px;">{t['argument']}</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.write("No debate was triggered — agent findings agreed with each other.")
    st.markdown('</div>', unsafe_allow_html=True)

with right:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Missing Evidence")
    missing_items = db.get_missing_evidence(claim["id"])
    if missing_items:
        for m in missing_items:
            st.write(f"⚠️ **{m['item']}**")
            st.caption(f"{m['priority'].title()} priority")
    else:
        st.write("No missing evidence flagged.")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Argument Weights")
    if debate:
        support_w = sum(t["weight"] for t in debate if t["stance"] == "supports")
        dispute_w = sum(t["weight"] for t in debate if t["stance"] == "disputes")
        total_w = support_w + dispute_w
        if total_w:
            st.write("Supporting evidence")
            st.progress(support_w / total_w, text=f"{round(100*support_w/total_w)}%")
            st.write("Disputing evidence")
            st.progress(dispute_w / total_w, text=f"{round(100*dispute_w/total_w)}%")
    else:
        st.write("N/A — no debate on this claim.")
    st.markdown('</div>', unsafe_allow_html=True)

    if decision:
        st.markdown('<div class="cc-card">', unsafe_allow_html=True)
        st.markdown("#### Adjudicator Verdict")
        st.markdown(f"**{decision['routing'].replace('_', ' ').title()}**")
        st.write(decision["rationale"])
        st.caption(f"Confidence: {decision['confidence']:.0f}%")
        st.markdown('</div>', unsafe_allow_html=True)
