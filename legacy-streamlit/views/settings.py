import streamlit as st

import config
import db
from components.header import render_header
from llm.client import check_ollama_status

render_header(
    title="Settings",
    subtitle="Configure AI agents, inference settings, and routing thresholds.",
)

settings = db.get_settings()

st.markdown('<div class="cc-card">', unsafe_allow_html=True)
st.markdown("### LLM Configuration")

c1, c2 = st.columns([2, 1])
with c1:
    st.markdown("**Inference Mode**")
    st.caption("Select local or cloud AI inference engine — also controlled by the "
               "toggle in the top-right of every page.")
with c2:
    st.write(f"Currently: **{st.session_state.get('llm_mode', 'local').upper()} LLM**")

st.write("")
ollama_up, models = check_ollama_status()
st.markdown("**Local Model**")
lc1, lc2 = st.columns([3, 1])
lc1.write(f"{config.OLLAMA_TEXT_MODEL} via Ollama · {config.OLLAMA_HOST}")
lc2.markdown(
    f'<span class="cc-badge {"cc-badge-sage" if ollama_up else "cc-badge-danger"}">'
    f'{"CONNECTED" if ollama_up else "UNREACHABLE"}</span>',
    unsafe_allow_html=True,
)
if ollama_up and models:
    st.caption("Models available locally: " + ", ".join(models))
elif not ollama_up:
    st.caption(f"Start Ollama with `ollama serve` and pull the model with "
               f"`ollama pull {config.OLLAMA_TEXT_MODEL}`.")

st.write("")
st.markdown("**Cloud Model**")
cc1, cc2 = st.columns([3, 1])
cc1.write(f"{config.ANTHROPIC_TEXT_MODEL} via Anthropic API")
has_key = bool(config.ANTHROPIC_API_KEY)
cc2.markdown(
    f'<span class="cc-badge {"cc-badge-sage" if has_key else "cc-badge-danger"}">'
    f'{"API KEY SET" if has_key else "NOT CONFIGURED"}</span>',
    unsafe_allow_html=True,
)
if not has_key:
    st.caption("Set ANTHROPIC_API_KEY in your .env file to enable Cloud LLM mode.")

st.write("")
st.caption("Any claim the AI recommends **rejecting** is always sent to Human Review "
           "for a reviewer to confirm — regardless of confidence — so the threshold "
           "below only controls automated **approvals**.")
auto_thresh = st.slider("Confidence threshold — minimum for automated approval",
                         0, 100, int(settings.get("confidence_auto_approve", 80.0)))
review_thresh = st.slider("Confidence threshold — below this, always send to human review",
                           0, 100, int(settings.get("confidence_human_review", 75.0)))
blocks_auto = st.checkbox("Any unresolved high/critical contradiction forces human review "
                           "(overrides the confidence threshold)",
                           value=settings.get("contradiction_blocks_auto", True))
st.markdown('</div>', unsafe_allow_html=True)

st.markdown('<div class="cc-card">', unsafe_allow_html=True)
st.markdown("### Agent Configuration")
doc_enabled = st.toggle("Document Agent — PDF and form extraction pipeline",
                         value=settings.get("document_agent_enabled", True))
vision_enabled = st.toggle("Vision Agent — damage image analysis",
                            value=settings.get("vision_agent_enabled", True))
audio_enabled = st.toggle("Audio Agent — customer statement analysis",
                           value=settings.get("audio_agent_enabled", True))
st.markdown('</div>', unsafe_allow_html=True)

if st.button("Save Settings", type="primary"):
    if review_thresh > auto_thresh:
        st.error("The human-review threshold can't be higher than the auto-approval "
                  "threshold — lower it or raise the auto-approval threshold first.")
    else:
        db.set_setting("confidence_auto_approve", float(auto_thresh))
        db.set_setting("confidence_human_review", float(review_thresh))
        db.set_setting("contradiction_blocks_auto", bool(blocks_auto))
        db.set_setting("document_agent_enabled", bool(doc_enabled))
        db.set_setting("vision_agent_enabled", bool(vision_enabled))
        db.set_setting("audio_agent_enabled", bool(audio_enabled))
        st.success("Settings saved. They'll apply the next time a claim is analyzed.")
