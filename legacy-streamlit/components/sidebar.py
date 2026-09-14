"""
Sidebar chrome: logo/wordmark at the top, a custom-rendered nav list in the
middle, and a live "system status" panel at the bottom that reflects real
state -- whether Ollama is reachable and which agents are enabled in
Settings -- rather than a hard-coded "READY" list.

The nav is deliberately NOT Streamlit's auto-rendered sidebar nav
(st.navigation's built-in list). That component bakes in its own
"inactive link" text styling with high CSS specificity that's very hard to
reliably override, which is what caused inactive nav items to render as
dim, muddy text instead of clean, readable text. Rendering it ourselves
with plain st.button widgets -- the same approach already used for the LLM
toggle -- gives full, reliable control over color and contrast.

Contrast note (System Status panel): the sidebar background is the dark
Space Cadet brand color. Slate Gray -- one of the five brand colors -- is
*also* a dark, desaturated blue, so Slate Gray text on a Space Cadet
background has very low contrast and is genuinely hard to read (this was
the sidebar bug: agent names/status were previously set in a color close
to the background). Every line below is set in white/near-white for the
label text, with color reserved for small, high-contrast status pills
(Tan-on-tint for enabled/ready, Caput-Mortuum-on-tint for disabled/down)
so status is still visually scannable at a glance without sacrificing
legibility.
"""
import streamlit as st

import config
import db
from llm.client import check_ollama_status

# (page path passed to st.Page / st.switch_page, sidebar label)
NAV_ITEMS = [
    ("views/overview.py", "Overview"),
    ("views/claim_intake.py", "Claim Intake"),
    ("views/evidence_analysis.py", "Evidence Analysis"),
    ("views/reasoning.py", "Reasoning"),
    ("views/decision_routing.py", "Decision & Routing"),
    ("views/reports.py", "Reports"),
    ("views/settings.py", "Settings"),
]


def render_nav(active_title):
    """Renders the sidebar nav. `active_title` is the title of the
    currently-open page (pg.title from st.navigation in app.py), used to
    highlight the matching row."""
    for i, (path, label) in enumerate(NAV_ITEMS):
        is_active = (label == active_title)
        container_key = f"navitem_active_{i}" if is_active else f"navitem_inactive_{i}"
        with st.container(key=container_key):
            clicked = st.button(f"{label}", key=f"navbtn_{i}", width="stretch")
        if clicked and not is_active:
            st.switch_page(path)
    st.markdown('<div style="margin-bottom:10px;"></div>', unsafe_allow_html=True)


def render_logo():
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:10px;padding:6px 2px 14px 2px;">
        <div style="width:34px;height:34px;border-radius:9px;
             background:{config.COLOR_TAN};display:flex;align-items:center;
             justify-content:center;font-family:'Playfair Display',serif;
             font-weight:700;font-size:18px;color:{config.COLOR_SPACE_CADET};">C</div>
        <div>
            <div style="font-family:'Playfair Display',serif;font-weight:700;
                 font-size:18px;color:{config.COLOR_WHITE};line-height:1.1;">
                 {config.APP_NAME}</div>
            <div style="font-size:10px;letter-spacing:.08em;color:{config.COLOR_WHITE}99;">
                 {config.APP_TAGLINE}</div>
        </div>
    </div>
    <hr style="border-color:{config.COLOR_WHITE}22;margin:0 0 10px 0;">
    """, unsafe_allow_html=True)


def _status_pill(enabled, on_label, off_label):
    if enabled:
        bg, fg = f"{config.COLOR_TAN}33", config.COLOR_TAN
        label = on_label
    else:
        bg, fg = f"{config.COLOR_CAPUT_MORTUUM}55", "#F3C7C9"
        label = off_label
    return (f'<span style="background:{bg};color:{fg};padding:2px 8px;'
            f'border-radius:999px;font-size:10.5px;font-weight:700;'
            f'letter-spacing:.03em;">{label}</span>')


def render_status():
    settings = db.get_settings()
    ollama_up, models = check_ollama_status()

    agent_flags = [
        ("Document Agent", settings.get("document_agent_enabled", True)),
        ("Vision Agent", settings.get("vision_agent_enabled", True)),
        ("Audio Agent", settings.get("audio_agent_enabled", True)),
        ("Reasoning Engine", True),
    ]
    rows = []
    for name, enabled in agent_flags:
        pill = _status_pill(enabled, "READY", "DISABLED")
        rows.append(
            f'<div style="display:flex;justify-content:space-between;align-items:center;'
            f'padding:5px 0;font-size:12.5px;color:{config.COLOR_WHITE};font-weight:600;">'
            f'<span>{name}</span>{pill}</div>'
        )

    mode = st.session_state.get("llm_mode", "local")
    if mode == "local":
        backend_ok = ollama_up
        backend_label_on, backend_label_off = "OLLAMA CONNECTED", "OLLAMA UNREACHABLE"
    else:
        backend_ok = bool(config.ANTHROPIC_API_KEY)
        backend_label_on, backend_label_off = "API KEY SET", "API KEY MISSING"

    backend_pill = _status_pill(backend_ok, backend_label_on, backend_label_off)

    st.markdown(f"""
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid {config.COLOR_WHITE}22;">
        <div style="font-size:10px;letter-spacing:.08em;color:{config.COLOR_WHITE}99;
             margin-bottom:8px;font-weight:700;">SYSTEM STATUS</div>
        {''.join(rows)}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;
             font-size:12.5px;color:{config.COLOR_WHITE};font-weight:600;">
            <span>LLM Backend</span>{backend_pill}
        </div>
    </div>
    """, unsafe_allow_html=True)
