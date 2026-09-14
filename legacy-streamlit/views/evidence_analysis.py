import streamlit as st

import db
from components.header import render_header
from utils.claim_picker import pick_claim

claim = None
badges = []

with st.container():
    pass  # header rendered after we know the claim, for the badges

# We need the claim before we can build header badges, but the picker itself
# should sit below the header for layout consistency — so render header first
# with a placeholder, then fill it in.
render_header(title="Evidence Analysis")

claim = pick_claim()
if not claim:
    st.stop()

decision = db.get_decision(claim["id"])
findings = db.get_agent_findings(claim["id"])
contradictions = db.get_contradictions(claim["id"])
missing_items = db.get_missing_evidence(claim["id"])

badge_html = ""
if decision:
    sev_class = {"HIGH": "cc-badge-danger", "MEDIUM": "cc-badge-tan",
                 "LOW": "cc-badge-sage"}.get(decision["severity"], "cc-badge-tan")
    badge_html += f'<span class="cc-badge {sev_class}" style="margin-left:8px;">{decision["severity"]} SEVERITY</span>'
if contradictions:
    badge_html += f'<span class="cc-badge cc-badge-danger" style="margin-left:8px;">CONTRADICTION DETECTED</span>'

st.markdown(f"""
<div style="margin-top:-8px;">
<h3 style="display:inline;">{claim['claim_id']}</h3> {badge_html}
</div>
<div style="color:#25344F99;margin-bottom:18px;">
{claim['claimant_name']} · {claim['incident_type']} ·
{__import__('datetime').datetime.fromtimestamp(claim['created_at']).strftime('%b %d, %Y')}
</div>
""", unsafe_allow_html=True)

if not findings:
    st.warning("This claim hasn't been through the pipeline yet.")
    st.stop()

left, right = st.columns([3, 2])

AGENT_ICON = {"Document Agent": "📄", "Vision Agent": "🖼️", "Audio Agent": "🎙️"}

with left:
    st.markdown("#### Agent Pipeline")
    for f in findings:
        status_badge = {"complete": "cc-badge-sage", "error": "cc-badge-danger",
                         "skipped": "cc-badge-tan"}.get(f["status"], "cc-badge-tan")
        st.markdown('<div class="cc-card">', unsafe_allow_html=True)
        st.markdown(
            f"**{AGENT_ICON.get(f['agent_name'], '🤖')} {f['agent_name']}** "
            f'<span class="cc-badge {status_badge}" style="margin-left:8px;">{f["status"].upper()}</span>',
            unsafe_allow_html=True,
        )
        st.write(f["summary"])
        if f["status"] == "complete":
            st.progress(min(f["confidence"] / 100, 1.0), text=f"{f['confidence']:.0f}% confidence")
        st.markdown('</div>', unsafe_allow_html=True)

with right:
    if contradictions:
        st.markdown('<div class="cc-card" style="border-color:#63202455;">', unsafe_allow_html=True)
        st.markdown("#### ⚠️ Potential Contradiction Detected")
        for c in contradictions:
            st.write(f"**{c['severity'].upper()}** — {c['description']}")
        st.caption("This inconsistency prevents autonomous resolution and may require human review.")
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="cc-card">', unsafe_allow_html=True)
        st.markdown("#### ✅ No Contradictions Detected")
        st.write("Agent findings are consistent with each other.")
        st.markdown('</div>', unsafe_allow_html=True)

    if missing_items:
        st.markdown('<div class="cc-card">', unsafe_allow_html=True)
        st.markdown("#### Missing Evidence")
        for m in missing_items:
            st.write(f"⚠️ **{m['item']}** — {m['priority']} priority")
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("#### Agent Confidence Summary")
    for f in findings:
        if f["status"] == "complete":
            st.write(f["agent_name"])
            st.progress(min(f["confidence"] / 100, 1.0), text=f"{f['confidence']:.0f}%")
    st.markdown('</div>', unsafe_allow_html=True)

st.markdown("#### Evidence Used")
evidence = db.get_evidence(claim["id"])
if evidence:
    for e in evidence:
        st.markdown(f"🔗 **{e['kind'].title()}** — {e['filename']}")
else:
    st.write("No evidence files were attached to this claim.")
