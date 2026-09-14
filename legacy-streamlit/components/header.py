"""
Shared header rendered at the top of every page: the app title area, the
persistent Local LLM / Cloud LLM glass toggle, a real-event notification
bell, and the logged-in employer's profile menu (top-right), plus an
optional page title/subtitle block underneath.

The selected LLM mode lives in st.session_state.llm_mode so it survives
navigation between pages, and is also persisted to the settings table so it
survives a full app restart.
"""
import datetime

import streamlit as st

import auth
import config
import db
from utils.styling import inject_global_css


def _ensure_state():
    if "llm_mode" not in st.session_state:
        settings = db.get_settings()
        st.session_state.llm_mode = settings.get("llm_mode", "local")


def _set_mode(mode):
    st.session_state.llm_mode = mode
    db.set_setting("llm_mode", mode)


def render_glass_toggle():
    _ensure_state()
    mode = st.session_state.llm_mode

    with st.container(key="cc_glass_pill"):
        c1, c2 = st.columns(2)
        with c1:
            key = "llm_opt_active" if mode == "local" else "llm_opt_inactive"
            with st.container(key=key):
                if st.button("● LOCAL LLM", key="llm_local_btn", width="stretch"):
                    _set_mode("local")
                    st.rerun()
        with c2:
            key = "llm_opt_active" if mode == "cloud" else "llm_opt_inactive"
            with st.container(key=key):
                if st.button("● CLOUD LLM", key="llm_cloud_btn", width="stretch"):
                    _set_mode("cloud")
                    st.rerun()

    sub = (f"Local Model &nbsp;·&nbsp; {config.OLLAMA_TEXT_MODEL} · Ollama"
           if mode == "local" else "Cloud LLM &nbsp;·&nbsp; Cloud inference")
    st.markdown(f'<div class="cc-glass-sub">{sub}</div>', unsafe_allow_html=True)


def _render_notification_bell():
    unread = db.unread_notification_count()
    label = f"🔔 {unread}" if unread else "🔔"
    with st.popover(label, width="content"):
        st.markdown("**Notifications**")
        notes = db.list_notifications(limit=15)
        if not notes:
            st.caption("No notifications yet. Notifications appear here as claims "
                       "are submitted, decided, and reviewed.")
        else:
            if unread and st.button("Mark all as read", key="mark_all_read"):
                db.mark_all_notifications_read()
                st.rerun()
            for n in notes:
                ts = datetime.datetime.fromtimestamp(n["created_at"]).strftime("%b %d · %H:%M")
                dot = "●" if not n["is_read"] else "○"
                st.markdown(
                    f'<div style="padding:6px 0;border-bottom:1px solid {config.COLOR_TAN}55;">'
                    f'<div style="font-size:12.5px;font-weight:700;color:{config.COLOR_SPACE_CADET};">'
                    f'{dot} {n["title"]}</div>'
                    f'<div style="font-size:12px;color:{config.COLOR_SLATE_GRAY};">{n["message"]}</div>'
                    f'<div style="font-size:10.5px;color:{config.COLOR_SLATE_GRAY}99;margin-top:2px;">{ts}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )


def _render_profile_menu():
    user = auth.current_user()
    if not user:
        return
    initials = f"{(user.get('first_name') or ' ')[:1]}{(user.get('last_name') or ' ')[:1]}".upper()
    label = f"{initials} · {user.get('first_name', '')}"
    with st.popover(label, width="content"):
        st.markdown(f"**{user.get('first_name', '')} {user.get('last_name', '')}**")
        st.caption(user.get("email", ""))
        st.markdown("---")
        pending = len(db.list_human_reviews(status="pending"))
        review_label = f"🗂️ Human Reviews ({pending})" if pending else "🗂️ Human Reviews"
        if st.button(review_label, key="profile_human_reviews", width="stretch"):
            st.switch_page("views/human_reviews.py")
        if st.button("⚙️ Settings", key="profile_settings", width="stretch"):
            st.switch_page("views/settings.py")
        st.markdown("---")
        if st.button("Log Out", key="profile_logout", width="stretch"):
            auth.log_out()
            st.rerun()


def render_header(title=None, subtitle=None, badges=None):
    """Call once near the top of every page. `badges` is an optional list of
    (label, css_class) tuples rendered next to the title, e.g.
    [("HIGH SEVERITY", "cc-badge-danger")]."""
    inject_global_css()
    _ensure_state()

    top_l, top_r, top_bell, top_prof = st.columns([3, 2, 0.5, 0.9])
    with top_l:
        st.markdown(
            f'<div style="font-size:13px;color:{config.COLOR_SPACE_CADET}99;'
            f'letter-spacing:.05em;text-transform:uppercase;margin-top:10px;">'
            f'{config.APP_NAME} · {config.APP_TAGLINE}</div>',
            unsafe_allow_html=True,
        )
    with top_r:
        render_glass_toggle()
    with top_bell:
        st.markdown('<div style="margin-top:2px;">', unsafe_allow_html=True)
        _render_notification_bell()
        st.markdown('</div>', unsafe_allow_html=True)
    with top_prof:
        st.markdown('<div style="margin-top:2px;">', unsafe_allow_html=True)
        _render_profile_menu()
        st.markdown('</div>', unsafe_allow_html=True)

    if title:
        badge_html = ""
        if badges:
            chips = "".join(
                f'<span class="cc-badge {cls}" style="margin-left:8px;">{label}</span>'
                for label, cls in badges
            )
            badge_html = chips
        st.markdown(f'<h1 style="margin-bottom:2px;">{title}{badge_html}</h1>',
                     unsafe_allow_html=True)
    if subtitle:
        st.markdown(
            f'<div style="color:{config.COLOR_SPACE_CADET}AA;font-size:15px;'
            f'margin-bottom:22px;">{subtitle}</div>',
            unsafe_allow_html=True,
        )
