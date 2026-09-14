import datetime
import shutil
import uuid

import streamlit as st

import db
from agents.pipeline import run_pipeline
from components.header import render_header
from config import UPLOADS_DIR
from utils import audio as audio_utils
from utils.parsing import extract_text

render_header(
    title="Claim Submission",
    subtitle="Submit claim evidence for multimodal AI analysis. All agents "
              "process the uploaded evidence concurrently.",
)

if "intake_claim_id" not in st.session_state:
    st.session_state.intake_claim_id = f"CLM-{datetime.date.today().year}-{uuid.uuid4().hex[:4].upper()}"

left, right = st.columns(2)

with left:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("### Claim Information")
    c1, c2 = st.columns(2)
    claim_id = c1.text_input("CLAIM ID", value=st.session_state.intake_claim_id)
    policy_number = c2.text_input("POLICY NUMBER", placeholder="POL-000-0000")
    claimant_name = st.text_input("CLAIMANT NAME", placeholder="Jane Doe")
    incident_type = st.selectbox(
        "INCIDENT TYPE",
        ["Auto — Collision", "Auto — Theft", "Property — Flood", "Property — Fire",
         "Property — Liability", "Auto — Liability", "Other"],
    )
    incident_description = st.text_area(
        "INCIDENT DESCRIPTION",
        placeholder="Describe what happened, as reported by the claimant or adjuster...",
        height=120,
    )
    st.markdown('</div>', unsafe_allow_html=True)

with right:
    st.markdown('<div class="cc-card">', unsafe_allow_html=True)
    st.markdown("### Evidence Upload")
    st.caption("Upload supporting documentation")

    doc_files = st.file_uploader(
        "Claim Documents (PDF, DOCX, TXT)", type=["pdf", "docx", "txt"],
        accept_multiple_files=True, key="doc_upload",
    )
    image_files = st.file_uploader(
        "Damage Images (JPG, PNG)", type=["jpg", "jpeg", "png"],
        accept_multiple_files=True, key="img_upload",
    )
    audio_file = st.file_uploader(
        "Audio Statement (WAV, MP3, M4A) — optional", type=["wav", "mp3", "m4a"],
        key="audio_upload",
    )

    manual_transcript = ""
    if audio_file is not None:
        if audio_utils.whisper_available():
            st.caption("Will be auto-transcribed with faster-whisper on submit.")
        else:
            st.warning(
                "Automatic transcription isn't installed in this environment. "
                "Paste the statement transcript below and it will be analyzed "
                "by the Audio Agent as-is."
            )
            manual_transcript = st.text_area("Statement transcript", height=100,
                                              key="manual_transcript")
    st.markdown('</div>', unsafe_allow_html=True)

st.write("")
run_clicked = st.button("Run Multi-Agent Analysis →", type="primary", width="content")

if run_clicked:
    if not claim_id or not claimant_name:
        st.error("Claim ID and Claimant Name are required.")
        st.stop()
    if db.get_claim_by_claim_id(claim_id):
        st.error(f"Claim {claim_id} already exists. Use a different Claim ID.")
        st.stop()

    claim_row_id = db.create_claim(claim_id, policy_number, claimant_name,
                                    incident_type, incident_description)
    db.create_notification(
        "claim_submitted",
        f"Claim {claim_id} submitted",
        f"{claimant_name} · {incident_type} · analysis starting now.",
        claim_row_id=claim_row_id,
    )
    claim_dir = UPLOADS_DIR / claim_row_id
    claim_dir.mkdir(parents=True, exist_ok=True)

    with st.status("Running ClarityClaim multi-agent pipeline...", expanded=True) as status_box:
        # -- store + extract documents --------------------------------
        for f in (doc_files or []):
            dest = claim_dir / f.name
            with open(dest, "wb") as out:
                out.write(f.getbuffer())
            text = extract_text(str(dest), f.name)
            db.add_evidence(claim_row_id, "document", f.name, str(dest), text)
        st.write(f"Stored {len(doc_files or [])} document(s).")

        # -- store images -----------------------------------------------
        for f in (image_files or []):
            dest = claim_dir / f.name
            with open(dest, "wb") as out:
                out.write(f.getbuffer())
            db.add_evidence(claim_row_id, "image", f.name, str(dest), "")
        st.write(f"Stored {len(image_files or [])} image(s).")

        # -- audio: transcribe or use manual transcript -----------------
        if audio_file is not None:
            dest = claim_dir / audio_file.name
            with open(dest, "wb") as out:
                out.write(audio_file.getbuffer())
            transcript, err = (None, None)
            if audio_utils.whisper_available():
                st.write("Transcribing audio locally with faster-whisper...")
                transcript, err = audio_utils.transcribe(str(dest))
            if not transcript:
                transcript = manual_transcript
            if err and not manual_transcript:
                st.write(f"⚠️ {err}")
            db.add_evidence(claim_row_id, "transcript", audio_file.name, str(dest),
                             transcript or "")
            st.write("Audio statement stored.")

        # -- run the agent pipeline --------------------------------------
        progress = st.progress(0.0)

        def cb(step_name, frac):
            progress.progress(frac, text=step_name)

        try:
            result = run_pipeline(claim_row_id, progress_cb=cb)
            status_box.update(label="Analysis complete.", state="complete")
        except Exception as e:
            status_box.update(label=f"Pipeline failed: {e}", state="error")
            st.exception(e)
            st.stop()

    st.session_state.active_claim_row_id = claim_row_id
    del st.session_state["intake_claim_id"]

    st.success(
        f"Claim {claim_id} analyzed — severity **{result['severity']}**, "
        f"joint confidence **{result['joint_confidence']}%**, routed to "
        f"**{result['routing'].replace('_', ' ').title()}**."
    )
    b1, b2 = st.columns(2)
    with b1:
        st.page_link("views/evidence_analysis.py", label="View Evidence Analysis →",
                      width="stretch")
    with b2:
        st.page_link("views/decision_routing.py", label="View Decision & Routing →",
                      width="stretch")
