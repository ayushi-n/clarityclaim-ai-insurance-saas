import streamlit as st

import auth
import config
import db
from components.sidebar import NAV_ITEMS, render_logo, render_nav, render_status

st.set_page_config(
    page_title=f"{config.APP_NAME} — Claims Intelligence",
    page_icon="🗂️",
    layout="wide",
    initial_sidebar_state="expanded",
)

db.init_db()

# Authentication gate: nothing below this renders until someone is logged
# in. auth.require_auth() draws the full-page Employer Login / Sign Up
# screen itself when there's no session, using the same DB and styling
# conventions as the rest of the app.
if not auth.require_auth():
    st.stop()

# Pages reachable through the ordinary sidebar (NAV_ITEMS) plus pages only
# reachable through another entry point in the UI -- currently just
# "Human Reviews", which is opened from the profile dropdown in the header
# rather than the sidebar. Both need to be registered with st.navigation so
# st.switch_page can jump to them; only NAV_ITEMS is rendered as sidebar
# rows (render_nav, below).
HIDDEN_PAGES = [
    ("views/human_reviews.py", "Human Reviews"),
]

# position="hidden" turns off Streamlit's own auto-rendered nav list, whose
# built-in "inactive link" text styling is baked in with high CSS
# specificity and can't be reliably reskinned from outside. We render our
# own nav (render_nav, below) using plain st.button widgets instead, which
# we fully control -- the same approach already used for the LLM toggle.
pg = st.navigation(
    [st.Page(path, title=title, default=(i == 0)) for i, (path, title) in enumerate(NAV_ITEMS)]
    + [st.Page(path, title=title) for path, title in HIDDEN_PAGES],
    position="hidden",
)

with st.sidebar:
    render_logo()
    render_nav(active_title=pg.title)
    render_status()

pg.run()
