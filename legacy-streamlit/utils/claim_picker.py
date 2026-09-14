import streamlit as st

import db


def pick_claim():
    """Renders a claim selector and returns the selected claim dict, or None
    if no claims exist yet. Keeps the selection in sync with
    st.session_state.active_claim_row_id so it carries over between pages."""
    claims = db.list_claims(limit=200)
    if not claims:
        st.info("No claims have been submitted yet. Go to **Claim Intake** to submit one.")
        st.page_link("views/claim_intake.py", label="Go to Claim Intake →")
        return None

    ids = [c["claim_id"] for c in claims]
    active_row_id = st.session_state.get("active_claim_row_id")
    default_index = 0
    if active_row_id:
        for i, c in enumerate(claims):
            if c["id"] == active_row_id:
                default_index = i
                break

    selected_claim_id = st.selectbox("Claim", ids, index=default_index, key="claim_picker")
    selected = next(c for c in claims if c["claim_id"] == selected_claim_id)
    st.session_state.active_claim_row_id = selected["id"]
    return selected
