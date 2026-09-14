import pandas as pd
import streamlit as st

import db
from components.header import render_header

render_header(
    title="Reports",
    subtitle="Analytics and audit exports for your claims portfolio, computed "
              "live from the claims you've actually processed.",
)

stats = db.dashboard_stats()
claims = db.list_claims(limit=1000)

if not claims:
    st.info("No claims processed yet — reports will populate once you run claims "
             "through the pipeline on the Claim Intake page.")
    st.page_link("views/claim_intake.py", label="Go to Claim Intake →")
    st.stop()

cols = st.columns(3)
agent_order = ["Document Agent", "Vision Agent", "Audio Agent"]
for col, agent in zip(cols, agent_order):
    avg_conf = stats["agent_avg_conf"].get(agent)
    count = stats["agent_counts"].get(agent, 0)
    with col:
        st.markdown('<div class="cc-card">', unsafe_allow_html=True)
        st.markdown(f'<div class="cc-label">{agent.upper()} — AVG. CONFIDENCE</div>', unsafe_allow_html=True)
        if avg_conf is not None:
            st.markdown(f'<div class="cc-metric">{avg_conf:.1f}%</div>', unsafe_allow_html=True)
            st.caption(f"Based on {count} claim(s) processed")
        else:
            st.markdown('<div class="cc-metric">—</div>', unsafe_allow_html=True)
            st.caption("No completed runs yet")
        st.markdown('</div>', unsafe_allow_html=True)

st.markdown('<div class="cc-card">', unsafe_allow_html=True)
st.markdown("### Monthly Claim Volume")
volume = db.monthly_volume()
if volume:
    df = pd.DataFrame(volume, columns=["Month", "Claims"]).set_index("Month")
    st.bar_chart(df, color="#6F4D38")
else:
    st.write("No data yet.")
st.markdown('</div>', unsafe_allow_html=True)

r1, r2 = st.columns(2)
with r1:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("### Severity Mix")
    decided = [c for c in claims if db.get_decision(c["id"])]
    if decided:
        sev_counts = {}
        for c in decided:
            d = db.get_decision(c["id"])
            sev_counts[d["severity"]] = sev_counts.get(d["severity"], 0) + 1
        df = pd.DataFrame(list(sev_counts.items()), columns=["Severity", "Count"]).set_index("Severity")
        st.bar_chart(df, color="#25344F")
    else:
        st.write("No decisions recorded yet.")
    st.markdown('</div>', unsafe_allow_html=True)

with r2:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("### Routing Outcomes")
    if stats["routing_counts"]:
        df = pd.DataFrame(list(stats["routing_counts"].items()), columns=["Routing", "Count"])
        df["Routing"] = df["Routing"].str.replace("_", " ").str.title()
        st.bar_chart(df.set_index("Routing"), color="#D5B893")
    else:
        st.write("No decisions recorded yet.")
    st.markdown('</div>', unsafe_allow_html=True)

st.markdown('<div class="cc-card">', unsafe_allow_html=True)
st.markdown("### Claim Log")
rows = []
for c in claims:
    d = db.get_decision(c["id"])
    review = db.get_latest_human_review(c["id"]) if d and d["routing"] == "human_review" else None
    final = review["final_decision"] if review and review["status"] == "completed" else None
    rows.append({
        "Claim ID": c["claim_id"],
        "Claimant": c["claimant_name"],
        "Type": c["incident_type"],
        "Status": c["status"],
        "Severity": d["severity"] if d else "—",
        "Confidence": f"{d['confidence']:.0f}%" if d else "—",
        "Routing": d["routing"].replace("_", " ").title() if d else "—",
        "AI Recommendation": (d.get("recommended_decision") or "—").title() if d else "—",
        "Final Decision": final.title() if final else ("Pending" if review else ("Approved" if d and d["routing"] == "auto_approve" else "—")),
    })
st.dataframe(pd.DataFrame(rows), width="stretch", hide_index=True)
st.markdown('</div>', unsafe_allow_html=True)
