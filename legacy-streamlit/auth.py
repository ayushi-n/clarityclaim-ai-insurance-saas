"""
Authentication for ClarityClaim.

A lightweight employer-login / sign-up gate that sits in front of the
existing dashboard. Credentials are stored in the same SQLite database as
everything else (db.py -> users table); passwords are never stored in
plain text (PBKDF2-HMAC-SHA256 with a random per-user salt, stdlib only).

app.py calls `require_auth()` before rendering any dashboard page. It
returns True once a user is logged in (and st.session_state.auth_user is
set); otherwise it renders the login/sign-up screen itself and the caller
should stop rendering for this run.
"""
import hashlib
import os
import re

import streamlit as st

import config
import db

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def _hash_password(password, salt=None):
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt,
                                  config.PBKDF2_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def _verify_password(password, stored):
    try:
        salt_hex, _digest_hex = stored.split("$", 1)
    except (ValueError, AttributeError):
        return False
    salt = bytes.fromhex(salt_hex)
    candidate = _hash_password(password, salt=salt)
    return candidate == stored


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------
def current_user():
    return st.session_state.get("auth_user")


def is_authenticated():
    return current_user() is not None


def log_out():
    st.session_state.pop("auth_user", None)


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------
def _auth_css():
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] {{ font-family: 'Inter', sans-serif; }}
    [data-testid="stAppViewContainer"] {{ background-color: {config.COLOR_PAGE_BG}; }}
    [data-testid="stHeader"] {{ background-color: transparent; }}
    #cc-auth-wordmark {{
        display:flex; align-items:center; gap:12px; justify-content:center;
        margin-top: 18px; margin-bottom: 4px;
    }}
    #cc-auth-tagline {{
        text-align:center; font-size:12px; letter-spacing:.12em;
        color:{config.COLOR_SLATE_GRAY}; margin-bottom:28px; text-transform:uppercase;
    }}
    div[data-testid="stForm"] {{
        background:{config.COLOR_WHITE}; border:1px solid {config.COLOR_TAN};
        border-radius:16px; padding: 8px 6px 4px 6px;
        box-shadow: 0 6px 24px rgba(37,52,79,0.10);
    }}
    h1, h2, h3 {{ font-family:'Playfair Display', serif !important;
                  color:{config.COLOR_SPACE_CADET} !important; }}
    [data-testid="stAppViewContainer"] label,
    [data-testid="stAppViewContainer"] [data-testid="stMarkdownContainer"] p {{
        color:{config.COLOR_SPACE_CADET} !important;
    }}
    div.stButton > button, div.stFormSubmitButton > button {{
        background-color:{config.COLOR_COFFEE}; color:{config.COLOR_WHITE} !important;
        border-radius:10px; border:none; font-weight:700; padding:0.55rem 1.1rem;
        width:100%;
    }}
    div.stButton > button:hover, div.stFormSubmitButton > button:hover {{
        background-color:{config.COLOR_SPACE_CADET}; color:{config.COLOR_WHITE} !important;
    }}
    .st-key-auth_tab_active div.stButton > button {{
        background-color:{config.COLOR_SPACE_CADET} !important;
    }}
    .st-key-auth_tab_inactive div.stButton > button {{
        background-color:transparent !important; color:{config.COLOR_SLATE_GRAY} !important;
        border:1px solid {config.COLOR_TAN} !important;
    }}
    </style>
    """, unsafe_allow_html=True)


def _wordmark():
    st.markdown(f"""
    <div id="cc-auth-wordmark">
        <div style="width:44px;height:44px;border-radius:12px;background:{config.COLOR_COFFEE};
             display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;
             font-weight:700;font-size:22px;color:{config.COLOR_WHITE};">C</div>
        <div style="font-family:'Playfair Display',serif;font-weight:700;font-size:28px;
             color:{config.COLOR_SPACE_CADET};">{config.APP_NAME}</div>
    </div>
    <div id="cc-auth-tagline">{config.APP_TAGLINE} &nbsp;·&nbsp; EMPLOYER PORTAL</div>
    """, unsafe_allow_html=True)


def _login_form():
    with st.form("login_form", border=True):
        st.markdown("### Employer Login")
        st.caption("Sign in with your company email to access the claims dashboard.")
        email = st.text_input("COMPANY EMAIL", placeholder="you@company.com", key="login_email")
        password = st.text_input("PASSWORD", type="password", key="login_password")
        submitted = st.form_submit_button("Log In")

    if submitted:
        if not email or not password:
            st.error("Enter your company email and password.")
            return
        user = db.get_user_by_email(email)
        if not user or not _verify_password(password, user["password_hash"]):
            st.error("Incorrect email or password.")
            return
        st.session_state.auth_user = {
            "id": user["id"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "email": user["email"],
        }
        st.rerun()


def _signup_form():
    with st.form("signup_form", border=True):
        st.markdown("### Create Your Account")
        st.caption("Sign up with your company email to start using ClarityClaim.")
        c1, c2 = st.columns(2)
        first_name = c1.text_input("FIRST NAME", key="signup_first")
        last_name = c2.text_input("LAST NAME", key="signup_last")
        dob = st.date_input("DATE OF BIRTH", key="signup_dob",
                             min_value=None, format="YYYY-MM-DD")
        email = st.text_input("COMPANY EMAIL", placeholder="you@company.com", key="signup_email")
        c3, c4 = st.columns(2)
        password = c3.text_input("PASSWORD", type="password", key="signup_password")
        confirm = c4.text_input("CONFIRM PASSWORD", type="password", key="signup_confirm")
        submitted = st.form_submit_button("Sign Up")

    if submitted:
        errors = []
        if not first_name or not last_name:
            errors.append("First and last name are required.")
        if not email or not EMAIL_RE.match(email):
            errors.append("Enter a valid company email address.")
        if not password or len(password) < 8:
            errors.append("Password must be at least 8 characters.")
        if password != confirm:
            errors.append("Passwords do not match.")
        if email and db.get_user_by_email(email):
            errors.append("An account with that email already exists — log in instead.")

        if errors:
            for e in errors:
                st.error(e)
            return

        password_hash = _hash_password(password)
        db.create_user(first_name.strip(), last_name.strip(), str(dob), email, password_hash)
        st.success("Account created — you can log in now.")
        st.session_state.auth_tab = "Log In"
        st.rerun()


def render_auth_gate():
    """Renders the full-page login/sign-up screen. Call only when
    `is_authenticated()` is False."""
    _auth_css()
    st.session_state.setdefault("auth_tab", "Log In")

    _, mid, _ = st.columns([1, 1.3, 1])
    with mid:
        _wordmark()

        t1, t2 = st.columns(2)
        with t1:
            key = "auth_tab_active" if st.session_state.auth_tab == "Log In" else "auth_tab_inactive"
            with st.container(key=key):
                if st.button("Log In", key="auth_tab_login_btn", width="stretch"):
                    st.session_state.auth_tab = "Log In"
                    st.rerun()
        with t2:
            key = "auth_tab_active" if st.session_state.auth_tab == "Sign Up" else "auth_tab_inactive"
            with st.container(key=key):
                if st.button("Sign Up", key="auth_tab_signup_btn", width="stretch"):
                    st.session_state.auth_tab = "Sign Up"
                    st.rerun()

        st.write("")
        if st.session_state.auth_tab == "Log In":
            _login_form()
        else:
            _signup_form()


def require_auth():
    """Returns True if the current session is authenticated. If not, renders
    the login/sign-up gate and returns False — callers should stop further
    rendering for this run."""
    if is_authenticated():
        return True
    render_auth_gate()
    return False
