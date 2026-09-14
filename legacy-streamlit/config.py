"""
Central configuration for ClarityClaim.
Loads environment variables (.env) and defines the UI color palette,
storage paths, and default agent/routing settings.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "clarityclaim.db"
DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Color palette
# Five brand colors, used consistently across the entire application. Every
# other color reference in the codebase (config.py, utils/styling.py, and
# every views/*.py page) resolves back to one of these five, either at full
# strength or blended with white/opacity for tints — no unrelated colors are
# introduced anywhere in the UI.
#
#   Space Cadet     #25344F   primary text, sidebar/header dark surfaces
#   Slate Gray      #617891   secondary text & muted UI accents (on LIGHT
#                              surfaces only — it does not have enough
#                              contrast to use as text on the dark Space
#                              Cadet sidebar, which is what made the old
#                              sidebar status text hard to read)
#   Tan             #D5B893   borders, light surface tints, active/selected
#                              states, "positive" badges
#   Coffee          #6F4D38   primary buttons/actions, headings accent
#   Caput Mortuum   #632024   danger / rejected / critical-severity states
# ---------------------------------------------------------------------------
COLOR_SPACE_CADET = "#25344F"
COLOR_SLATE_GRAY = "#617891"
COLOR_TAN = "#D5B893"
COLOR_COFFEE = "#6F4D38"
COLOR_CAPUT_MORTUUM = "#632024"

# Neutral surfaces (white / near-white). These are not brand colors — they
# are the light backdrop the five brand colors sit on top of, the same role
# "white paper" plays in a print palette. Every accent, text, badge, border,
# and button color on the page still comes from the five colors above.
COLOR_WHITE = "#FFFFFF"
COLOR_PAGE_BG = "#F6F1E9"   # a very light Tan tint, used only as page backdrop

# Backwards-compatible aliases so any code (old or new) that still imports
# the previous names keeps working, all pointing at the new five-color
# palette above.
COLOR_CAFE_NOIR = COLOR_SPACE_CADET       # primary text
COLOR_KOMBU_GREEN = COLOR_SPACE_CADET     # dark sidebar / header background
COLOR_SAGE_GREEN = COLOR_COFFEE           # primary accent / buttons
COLOR_SAGE_GREEN_DARK = COLOR_CAPUT_MORTUUM
COLOR_BONE = COLOR_PAGE_BG                # main light surfaces / backgrounds
COLOR_WHITE_SMOKE = COLOR_WHITE
COLOR_DANGER = COLOR_CAPUT_MORTUUM

# ---------------------------------------------------------------------------
# LLM configuration
# ---------------------------------------------------------------------------
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_TEXT_MODEL = os.getenv("OLLAMA_TEXT_MODEL", "llama3.1:8b")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llama3.2-vision")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_TEXT_MODEL = os.getenv("ANTHROPIC_TEXT_MODEL", "claude-3-5-sonnet-20241022")
ANTHROPIC_VISION_MODEL = os.getenv("ANTHROPIC_VISION_MODEL", "claude-3-5-sonnet-20241022")

# ---------------------------------------------------------------------------
# Routing / adjudication defaults (editable from the Settings page, values
# persisted to the settings table so they survive restarts)
# ---------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "llm_mode": "local",                 # "local" or "cloud"
    "confidence_auto_approve": 80.0,     # >= this, AI recommends approve, no blocking
                                          # contradiction -> auto_approve (fully automated)
    "confidence_human_review": 75.0,     # below this -> human_review, no exceptions
    "contradiction_blocks_auto": True,   # any unresolved high/critical contradiction
                                          # forces human review regardless of confidence
    "document_agent_enabled": True,
    "vision_agent_enabled": True,
    "audio_agent_enabled": True,
}

APP_NAME = "ClarityClaim"
APP_TAGLINE = "CLAIMS INTELLIGENCE"

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
PBKDF2_ITERATIONS = 200_000
