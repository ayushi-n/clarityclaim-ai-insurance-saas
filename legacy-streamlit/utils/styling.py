"""
Global visual styling for ClarityClaim. One CSS injection function, used by
every page, so the look stays consistent without duplicating style blocks.

Palette -- five brand colors, used consistently everywhere (see config.py
for the full rationale):
  Space Cadet     #25344F   primary text, sidebar / dark header surfaces
  Slate Gray      #617891   secondary text & muted accents (light surfaces)
  Tan             #D5B893   borders / light surface tints / active states
  Coffee          #6F4D38   primary buttons & accents
  Caput Mortuum   #632024   danger / rejected / critical severity

NOTE: most of the base widget coloring (sliders, checkboxes, radio buttons)
now comes from .streamlit/config.toml, which forces a light theme with our
palette instead of Streamlit's default red theme / the visitor's OS
dark-mode preference. The rules below are a belt-and-suspenders layer on
top of that, so text stays readable and widgets stay on-palette even if
config.toml isn't picked up for some reason (e.g. an older Streamlit
version, or the file being missed when copying the project).
"""
import streamlit as st

from config import (COLOR_CAPUT_MORTUUM, COLOR_COFFEE, COLOR_PAGE_BG,
                     COLOR_SLATE_GRAY, COLOR_SPACE_CADET, COLOR_TAN,
                     COLOR_WHITE)


def inject_global_css():
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

    html, body, [class*="css"] {{
        font-family: 'Inter', sans-serif;
        color: {COLOR_SPACE_CADET};
    }}
    h1, h2, h3 {{
        font-family: 'Playfair Display', serif !important;
        color: {COLOR_SPACE_CADET} !important;
        font-weight: 700 !important;
    }}

    [data-testid="stAppViewContainer"] {{
        background-color: {COLOR_PAGE_BG};
    }}
    [data-testid="stHeader"] {{
        background-color: transparent;
    }}

    /* ---- Hardened text contrast (main content area only -- the sidebar
       has its own rule further down that forces white text on the dark
       Space Cadet background) ---- */
    [data-testid="stAppViewContainer"] [data-testid="stMarkdownContainer"] p,
    [data-testid="stAppViewContainer"] [data-testid="stMarkdownContainer"] span,
    [data-testid="stAppViewContainer"] [data-testid="stMarkdownContainer"] li,
    [data-testid="stAppViewContainer"] label,
    [data-testid="stAppViewContainer"] [data-testid="stCaptionContainer"],
    [data-testid="stAppViewContainer"] [data-testid="stWidgetLabel"] p,
    [data-testid="stAppViewContainer"] [data-testid="stMetricValue"],
    [data-testid="stAppViewContainer"] [data-testid="stMetricLabel"] {{
        color: {COLOR_SPACE_CADET} !important;
    }}
    [data-testid="stAppViewContainer"] [data-testid="stCaptionContainer"] p {{
        color: {COLOR_SLATE_GRAY} !important;
    }}

    /* Sidebar */
    [data-testid="stSidebar"] {{
        background-color: {COLOR_SPACE_CADET};
    }}
    [data-testid="stSidebar"] * {{
        color: {COLOR_WHITE} !important;
    }}
    /* Streamlit's own auto-rendered nav is turned off entirely
       (st.navigation(..., position="hidden") in app.py) so there is
       nothing left to fight there. Defensive hide, just in case: */
    [data-testid="stSidebarNav"] {{
        display: none !important;
    }}

    /* ---- Custom sidebar nav (components/sidebar.py: render_nav) ----
       Plain st.button widgets, one per page, each wrapped in its own
       st.container(key=...) so we get a stable CSS hook per row. Which
       hook a row gets ("navitem_active_N" vs "navitem_inactive_N") is
       decided in Python each render, based on the real current page. */
    [data-testid="stSidebar"] [class*="st-key-navitem_active_"],
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] {{
        margin-bottom: 2px;
    }}
    [data-testid="stSidebar"] [class*="st-key-navitem_active_"] div.stButton > button,
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] div.stButton > button {{
        background: transparent !important;
        border: none !important;
        border-left: 3px solid transparent !important;
        border-radius: 8px !important;
        box-shadow: none !important;
        text-align: left !important;
        justify-content: flex-start !important;
        padding: 8px 10px !important;
        font-size: 14px !important;
    }}
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] div.stButton > button,
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] div.stButton > button p {{
        color: {COLOR_WHITE}CC !important;
        font-weight: 500 !important;
    }}
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] div.stButton > button:hover {{
        background: rgba(255,255,255,0.08) !important;
    }}
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] div.stButton > button:hover,
    [data-testid="stSidebar"] [class*="st-key-navitem_inactive_"] div.stButton > button:hover p {{
        color: {COLOR_WHITE} !important;
    }}
    [data-testid="stSidebar"] [class*="st-key-navitem_active_"] div.stButton > button {{
        background: rgba(213, 184, 147, 0.22) !important;
        border-left: 3px solid {COLOR_TAN} !important;
    }}
    [data-testid="stSidebar"] [class*="st-key-navitem_active_"] div.stButton > button,
    [data-testid="stSidebar"] [class*="st-key-navitem_active_"] div.stButton > button p {{
        color: {COLOR_WHITE} !important;
        font-weight: 700 !important;
    }}

    /* Cards */
    .cc-card {{
        background-color: {COLOR_WHITE};
        border: 1px solid {COLOR_TAN};
        border-radius: 14px;
        padding: 22px 24px;
        box-shadow: 0 2px 10px rgba(37,52,79,0.06);
        margin-bottom: 16px;
    }}
    .cc-card-flat {{
        background-color: {COLOR_PAGE_BG};
        border: 1px solid {COLOR_TAN};
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 10px;
    }}
    .cc-label {{
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 12px;
        font-weight: 600;
        color: {COLOR_SLATE_GRAY};
    }}
    .cc-metric {{
        font-family: 'Playfair Display', serif;
        font-size: 34px;
        font-weight: 700;
        color: {COLOR_SPACE_CADET};
        line-height: 1.1;
    }}

    /* Badges */
    .cc-badge {{
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }}
    .cc-badge-sage {{ background: {COLOR_TAN}40; color: {COLOR_COFFEE} !important; }}
    .cc-badge-tan {{ background: {COLOR_TAN}45; color: {COLOR_SPACE_CADET} !important; }}
    .cc-badge-danger {{ background: {COLOR_CAPUT_MORTUUM}22; color: {COLOR_CAPUT_MORTUUM} !important; }}
    .cc-badge-kombu {{ background: {COLOR_SPACE_CADET}1A; color: {COLOR_SPACE_CADET} !important; }}

    /* Buttons */
    div.stButton > button, div.stDownloadButton > button, div.stFormSubmitButton > button {{
        background-color: {COLOR_COFFEE};
        color: {COLOR_WHITE} !important;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        padding: 0.5rem 1.1rem;
    }}
    div.stButton > button:hover, div.stDownloadButton > button:hover,
    div.stFormSubmitButton > button:hover {{
        background-color: {COLOR_SPACE_CADET};
        color: {COLOR_WHITE} !important;
    }}
    div.stButton > button p, div.stDownloadButton > button p {{
        color: inherit !important;
    }}

    /* Popover (notification bell / profile menu) trigger buttons */
    [data-testid="stPopover"] > div > button {{
        background-color: {COLOR_PAGE_BG} !important;
        color: {COLOR_SPACE_CADET} !important;
        border: 1px solid {COLOR_TAN} !important;
        font-weight: 700 !important;
        border-radius: 999px !important;
        padding: 0.4rem 0.9rem !important;
    }}
    [data-testid="stPopover"] > div > button:hover {{
        background-color: {COLOR_TAN}33 !important;
        color: {COLOR_SPACE_CADET} !important;
    }}

    /* ---- Sliders: Coffee track/handle regardless of theme ---- */
    div[data-testid="stSlider"] div[data-baseweb="slider"] div[role="slider"] {{
        background-color: {COLOR_COFFEE} !important;
        border-color: {COLOR_COFFEE} !important;
    }}
    div[data-testid="stSlider"] div[data-baseweb="slider"] > div > div {{
        background: {COLOR_COFFEE} !important;
    }}
    div[data-testid="stSlider"] [data-testid="stTickBarMin"],
    div[data-testid="stSlider"] [data-testid="stTickBarMax"] {{
        color: {COLOR_SLATE_GRAY} !important;
    }}
    div[data-testid="stSliderTickBarMin"], div[data-testid="stSliderTickBarMax"] {{
        color: {COLOR_SLATE_GRAY} !important;
    }}
    /* current value bubble shown above the slider handle */
    div[data-testid="stThumbValue"] {{
        color: {COLOR_COFFEE} !important;
        font-weight: 700 !important;
    }}

    /* ---- Checkboxes / toggles: Coffee when checked ---- */
    label[data-testid="stCheckbox"] span[aria-checked="true"],
    div[data-testid="stCheckbox"] span[aria-checked="true"] {{
        background-color: {COLOR_COFFEE} !important;
        border-color: {COLOR_COFFEE} !important;
    }}
    div[data-testid="stToggle"] span[aria-checked="true"] {{
        background-color: {COLOR_COFFEE} !important;
    }}
    div[data-testid="stCheckbox"] label p, div[data-testid="stToggle"] label p {{
        color: {COLOR_SPACE_CADET} !important;
    }}

    /* Progress bars */
    div[data-testid="stProgress"] div[role="progressbar"] > div {{
        background-color: {COLOR_COFFEE} !important;
    }}

    /* Inputs */
    input, textarea, select {{
        border-radius: 8px !important;
        color: {COLOR_SPACE_CADET} !important;
    }}
    div[data-baseweb="select"] * {{
        color: {COLOR_SPACE_CADET} !important;
    }}

    /* Glass LLM toggle */
    .cc-glass-wrap {{
        display: flex;
        justify-content: flex-end;
        margin-bottom: 6px;
    }}
    .cc-glass {{
        display: inline-flex;
        align-items: center;
        gap: 2px;
        background: rgba(213,184,147,0.30);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid {COLOR_TAN};
        border-radius: 999px;
        padding: 4px;
        box-shadow: 0 4px 16px rgba(37,52,79,0.12);
    }}
    .cc-glass-opt {{
        padding: 7px 16px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.03em;
        display: flex;
        align-items: center;
        gap: 7px;
        transition: all .25s ease;
        color: {COLOR_SPACE_CADET};
    }}
    .cc-glass-opt.active {{
        background: {COLOR_COFFEE};
        color: {COLOR_WHITE};
    }}
    .cc-glass-dot {{
        width: 7px; height: 7px; border-radius: 50%;
        background: {COLOR_SPACE_CADET}66;
    }}
    .cc-glass-dot.on {{ background: {COLOR_COFFEE}; }}
    .cc-glass-sub {{
        font-size: 11px;
        color: {COLOR_SLATE_GRAY} !important;
        text-align: right;
        margin-top: 2px;
        margin-bottom: 10px;
    }}

    /* Glass toggle buttons: real, clickable st.button widgets styled as pill
       segments. Which container key is "active" vs "inactive" is decided in
       Python each render (components/header.py), so the CSS just needs to
       style the two possible states. */
    .st-key-llm_opt_active, .st-key-llm_opt_inactive {{
        display: inline-block;
    }}
    .st-key-llm_opt_active div.stButton > button {{
        background: {COLOR_COFFEE} !important;
        border: none !important;
        border-radius: 999px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.03em;
        padding: 0.35rem 0.9rem !important;
        box-shadow: none !important;
    }}
    .st-key-llm_opt_active div.stButton > button,
    .st-key-llm_opt_active div.stButton > button p {{
        color: {COLOR_WHITE} !important;
    }}
    .st-key-llm_opt_inactive div.stButton > button {{
        background: transparent !important;
        border: none !important;
        border-radius: 999px !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        letter-spacing: 0.03em;
        padding: 0.35rem 0.9rem !important;
        box-shadow: none !important;
    }}
    .st-key-llm_opt_inactive div.stButton > button,
    .st-key-llm_opt_inactive div.stButton > button p {{
        color: {COLOR_SPACE_CADET}CC !important;
    }}
    .st-key-llm_opt_active div.stButton > button:hover {{
        background: {COLOR_SPACE_CADET} !important;
    }}
    .st-key-llm_opt_active div.stButton > button:hover,
    .st-key-llm_opt_active div.stButton > button:hover p {{
        color: {COLOR_WHITE} !important;
    }}
    .st-key-llm_opt_inactive div.stButton > button:hover {{
        background: {COLOR_TAN}55 !important;
    }}
    .st-key-llm_opt_inactive div.stButton > button:hover,
    .st-key-llm_opt_inactive div.stButton > button:hover p {{
        color: {COLOR_SPACE_CADET} !important;
    }}
    .st-key-cc_glass_pill {{
        display: inline-flex;
        align-items: center;
        background: rgba(213,184,147,0.30);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid {COLOR_TAN};
        border-radius: 999px;
        padding: 3px;
        box-shadow: 0 4px 16px rgba(37,52,79,0.12);
    }}
    .st-key-cc_glass_pill div[data-testid="stHorizontalBlock"] {{
        gap: 0.15rem !important;
    }}
    </style>
    """, unsafe_allow_html=True)
