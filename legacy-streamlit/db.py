"""
SQLite persistence layer for ClarityClaim.

Everything the UI displays (claim counts, severity mix, agent confidence,
reports) is computed from real rows in this database — nothing is
hard-coded or faked. A fresh install starts empty and fills up as claims
are processed.
"""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager

from config import DB_PATH, DEFAULT_SETTINGS

SCHEMA = """
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    claim_id TEXT UNIQUE,
    policy_number TEXT,
    claimant_name TEXT,
    incident_type TEXT,
    incident_description TEXT,
    status TEXT DEFAULT 'intake',
    created_at REAL
);

CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    kind TEXT,              -- document | image | audio | transcript
    filename TEXT,
    filepath TEXT,
    extracted_text TEXT,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS agent_findings (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    agent_name TEXT,
    status TEXT,             -- complete | error | skipped
    summary TEXT,
    impact_location TEXT,
    confidence REAL,
    raw_json TEXT,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS contradictions (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    description TEXT,
    agents_involved TEXT,
    severity TEXT,           -- low | medium | high | critical
    created_at REAL
);

CREATE TABLE IF NOT EXISTS missing_evidence (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    item TEXT,
    priority TEXT,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS debate_log (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    round INTEGER,
    agent_name TEXT,
    stance TEXT,             -- supports | disputes
    argument TEXT,
    weight REAL,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    severity TEXT,
    confidence REAL,
    routing TEXT,               -- auto_approve | human_review
    recommended_decision TEXT,  -- approve | reject  (the AI's recommendation;
                                 -- routing decides WHO acts on it, this is WHAT
                                 -- was recommended)
    rationale TEXT,
    required_actions TEXT,    -- json list
    created_at REAL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    claim_row_id TEXT,        -- claims.id, nullable
    kind TEXT,                 -- claim_submitted | auto_approved | human_review |
                                -- review_completed
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS human_reviews (
    id TEXT PRIMARY KEY,
    claim_id TEXT,              -- claims.id
    decision_id TEXT,           -- decisions.id at the time it was routed
    status TEXT DEFAULT 'pending',   -- pending | completed
    ai_recommendation TEXT,     -- approve | reject
    final_decision TEXT,        -- approve | reject (set once completed)
    reviewer_name TEXT,
    notes TEXT,
    created_at REAL,
    reviewed_at REAL
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _ensure_column(conn, table, column, coldef):
    """Add `column` to `table` if it doesn't already exist. Lets an existing
    clarityclaim.db (created by an earlier version of this app) pick up new
    columns without losing any previously-stored data."""
    existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coldef}")


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        _ensure_column(conn, "decisions", "recommended_decision", "TEXT")
        cur = conn.execute("SELECT COUNT(*) c FROM settings")
        if cur.fetchone()["c"] == 0:
            for k, v in DEFAULT_SETTINGS.items():
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?)",
                    (k, json.dumps(v)),
                )
        else:
            # Fresh keys added after an earlier install (e.g. new agent
            # toggles/thresholds added in a later version) still need seeding
            # without touching keys the user already customized.
            existing_keys = {r["key"] for r in conn.execute("SELECT key FROM settings")}
            for k, v in DEFAULT_SETTINGS.items():
                if k not in existing_keys:
                    conn.execute(
                        "INSERT INTO settings (key, value) VALUES (?, ?)",
                        (k, json.dumps(v)),
                    )


def new_id():
    return uuid.uuid4().hex[:12]


def now():
    return time.time()


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
def get_settings():
    with get_conn() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        out = dict(DEFAULT_SETTINGS)
        for r in rows:
            try:
                out[r["key"]] = json.loads(r["value"])
            except Exception:
                out[r["key"]] = r["value"]
        return out


def set_setting(key, value):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value)),
        )


# ---------------------------------------------------------------------------
# Claims
# ---------------------------------------------------------------------------
def create_claim(claim_id, policy_number, claimant_name, incident_type, incident_description):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO claims (id, claim_id, policy_number, claimant_name,
               incident_type, incident_description, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'intake', ?)""",
            (row_id, claim_id, policy_number, claimant_name, incident_type,
             incident_description, now()),
        )
    return row_id


def update_claim_status(claim_row_id, status):
    with get_conn() as conn:
        conn.execute("UPDATE claims SET status=? WHERE id=?", (status, claim_row_id))


def get_claim(claim_row_id):
    with get_conn() as conn:
        r = conn.execute("SELECT * FROM claims WHERE id=?", (claim_row_id,)).fetchone()
        return dict(r) if r else None


def get_claim_by_claim_id(claim_id):
    with get_conn() as conn:
        r = conn.execute("SELECT * FROM claims WHERE claim_id=?", (claim_id,)).fetchone()
        return dict(r) if r else None


def list_claims(limit=200):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM claims ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------
def add_evidence(claim_row_id, kind, filename, filepath, extracted_text=""):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO evidence (id, claim_id, kind, filename, filepath,
               extracted_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (row_id, claim_row_id, kind, filename, filepath, extracted_text, now()),
        )
    return row_id


def get_evidence(claim_row_id, kind=None):
    with get_conn() as conn:
        if kind:
            rows = conn.execute(
                "SELECT * FROM evidence WHERE claim_id=? AND kind=? ORDER BY created_at",
                (claim_row_id, kind),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM evidence WHERE claim_id=? ORDER BY created_at",
                (claim_row_id,),
            ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Agent findings
# ---------------------------------------------------------------------------
def clear_pipeline_outputs(claim_row_id):
    """Wipe prior analysis for a claim before re-running the pipeline."""
    with get_conn() as conn:
        for table in ("agent_findings", "contradictions", "missing_evidence",
                      "debate_log", "decisions"):
            conn.execute(f"DELETE FROM {table} WHERE claim_id=?", (claim_row_id,))


def save_agent_finding(claim_row_id, agent_name, status, summary, impact_location,
                        confidence, raw_json):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO agent_findings (id, claim_id, agent_name, status, summary,
               impact_location, confidence, raw_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (row_id, claim_row_id, agent_name, status, summary, impact_location,
             confidence, json.dumps(raw_json), now()),
        )
    return row_id


def get_agent_findings(claim_row_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM agent_findings WHERE claim_id=? ORDER BY created_at",
            (claim_row_id,),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            try:
                d["raw"] = json.loads(d["raw_json"])
            except Exception:
                d["raw"] = {}
            out.append(d)
        return out


# ---------------------------------------------------------------------------
# Contradictions / missing evidence
# ---------------------------------------------------------------------------
def save_contradiction(claim_row_id, description, agents_involved, severity):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO contradictions (id, claim_id, description, agents_involved,
               severity, created_at) VALUES (?, ?, ?, ?, ?, ?)""",
            (row_id, claim_row_id, description, json.dumps(agents_involved), severity, now()),
        )
    return row_id


def get_contradictions(claim_row_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM contradictions WHERE claim_id=? ORDER BY created_at", (claim_row_id,)
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["agents_involved"] = json.loads(d["agents_involved"])
            out.append(d)
        return out


def save_missing_evidence(claim_row_id, item, priority):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO missing_evidence (id, claim_id, item, priority, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (row_id, claim_row_id, item, priority, now()),
        )
    return row_id


def get_missing_evidence(claim_row_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM missing_evidence WHERE claim_id=? ORDER BY created_at", (claim_row_id,)
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Debate log
# ---------------------------------------------------------------------------
def save_debate_turn(claim_row_id, round_no, agent_name, stance, argument, weight):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO debate_log (id, claim_id, round, agent_name, stance, argument,
               weight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (row_id, claim_row_id, round_no, agent_name, stance, argument, weight, now()),
        )
    return row_id


def get_debate_log(claim_row_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM debate_log WHERE claim_id=? ORDER BY round, created_at",
            (claim_row_id,),
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Decisions
# ---------------------------------------------------------------------------
def save_decision(claim_row_id, severity, confidence, routing, rationale, required_actions,
                   recommended_decision=None):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO decisions (id, claim_id, severity, confidence, routing,
               recommended_decision, rationale, required_actions, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (row_id, claim_row_id, severity, confidence, routing, recommended_decision,
             rationale, json.dumps(required_actions), now()),
        )
    return row_id


def get_decision(claim_row_id):
    with get_conn() as conn:
        r = conn.execute(
            "SELECT * FROM decisions WHERE claim_id=? ORDER BY created_at DESC LIMIT 1",
            (claim_row_id,),
        ).fetchone()
        if not r:
            return None
        d = dict(r)
        d["required_actions"] = json.loads(d["required_actions"])
        return d


# ---------------------------------------------------------------------------
# Aggregate stats for Overview / Reports (all real, computed from rows)
# ---------------------------------------------------------------------------
def dashboard_stats():
    with get_conn() as conn:
        claims_analyzed = conn.execute(
            "SELECT COUNT(*) c FROM claims WHERE status IN ('analyzed','decided')"
        ).fetchone()["c"]
        high_severity = conn.execute(
            "SELECT COUNT(*) c FROM decisions WHERE severity='HIGH'"
        ).fetchone()["c"]
        contradictions = conn.execute("SELECT COUNT(*) c FROM contradictions").fetchone()["c"]
        human_review = conn.execute(
            "SELECT COUNT(*) c FROM decisions WHERE routing='human_review'"
        ).fetchone()["c"]
        pending_human_review = conn.execute(
            "SELECT COUNT(*) c FROM human_reviews WHERE status='pending'"
        ).fetchone()["c"]
        approved = conn.execute(
            "SELECT COUNT(*) c FROM decisions WHERE routing='auto_approve' "
            "OR id IN (SELECT decision_id FROM human_reviews WHERE final_decision='approve')"
        ).fetchone()["c"]
        rejected = conn.execute(
            "SELECT COUNT(*) c FROM human_reviews WHERE final_decision='reject'"
        ).fetchone()["c"]

        routing_counts = {}
        for r in conn.execute("SELECT routing, COUNT(*) c FROM decisions GROUP BY routing"):
            routing_counts[r["routing"]] = r["c"]

        agent_avg_conf = {}
        agent_counts = {}
        for r in conn.execute(
            "SELECT agent_name, AVG(confidence) a, COUNT(*) c FROM agent_findings "
            "WHERE status='complete' GROUP BY agent_name"
        ):
            agent_avg_conf[r["agent_name"]] = round(r["a"] or 0, 1)
            agent_counts[r["agent_name"]] = r["c"]

        return {
            "claims_analyzed": claims_analyzed,
            "high_severity": high_severity,
            "contradictions": contradictions,
            "human_review": human_review,
            "pending_human_review": pending_human_review,
            "approved": approved,
            "rejected": rejected,
            "routing_counts": routing_counts,
            "agent_avg_conf": agent_avg_conf,
            "agent_counts": agent_counts,
        }


def monthly_volume():
    """Real claim counts per calendar month (from created_at), most recent 8 months."""
    import datetime
    with get_conn() as conn:
        rows = conn.execute("SELECT created_at FROM claims").fetchall()
    buckets = {}
    for r in rows:
        dt = datetime.datetime.fromtimestamp(r["created_at"])
        key = dt.strftime("%Y-%m")
        buckets[key] = buckets.get(key, 0) + 1
    ordered = sorted(buckets.items())[-8:]
    return ordered


# ---------------------------------------------------------------------------
# Users (auth)
# ---------------------------------------------------------------------------
def create_user(first_name, last_name, date_of_birth, email, password_hash):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO users (id, first_name, last_name, date_of_birth, email,
               password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (row_id, first_name, last_name, date_of_birth, email.lower().strip(),
             password_hash, now()),
        )
    return row_id


def get_user_by_email(email):
    with get_conn() as conn:
        r = conn.execute(
            "SELECT * FROM users WHERE email=?", (email.lower().strip(),)
        ).fetchone()
        return dict(r) if r else None


# ---------------------------------------------------------------------------
# Notifications (all created from real application events — see
# agents/pipeline.py, views/claim_intake.py, views/human_reviews.py)
# ---------------------------------------------------------------------------
def create_notification(kind, title, message, claim_row_id=None):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO notifications (id, claim_row_id, kind, title, message,
               is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)""",
            (row_id, claim_row_id, kind, title, message, now()),
        )
    return row_id


def list_notifications(limit=50):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def unread_notification_count():
    with get_conn() as conn:
        return conn.execute(
            "SELECT COUNT(*) c FROM notifications WHERE is_read=0"
        ).fetchone()["c"]


def mark_all_notifications_read():
    with get_conn() as conn:
        conn.execute("UPDATE notifications SET is_read=1 WHERE is_read=0")


def mark_notification_read(notification_id):
    with get_conn() as conn:
        conn.execute("UPDATE notifications SET is_read=1 WHERE id=?", (notification_id,))


# ---------------------------------------------------------------------------
# Human review queue
# ---------------------------------------------------------------------------
def create_human_review(claim_row_id, decision_id, ai_recommendation):
    row_id = new_id()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO human_reviews (id, claim_id, decision_id, status,
               ai_recommendation, created_at) VALUES (?, ?, ?, 'pending', ?, ?)""",
            (row_id, claim_row_id, decision_id, ai_recommendation, now()),
        )
    return row_id


def get_pending_human_review(claim_row_id):
    """Most recent pending review row for a claim, if any."""
    with get_conn() as conn:
        r = conn.execute(
            "SELECT * FROM human_reviews WHERE claim_id=? AND status='pending' "
            "ORDER BY created_at DESC LIMIT 1",
            (claim_row_id,),
        ).fetchone()
        return dict(r) if r else None


def get_latest_human_review(claim_row_id):
    with get_conn() as conn:
        r = conn.execute(
            "SELECT * FROM human_reviews WHERE claim_id=? ORDER BY created_at DESC LIMIT 1",
            (claim_row_id,),
        ).fetchone()
        return dict(r) if r else None


def list_human_reviews(status=None):
    with get_conn() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM human_reviews WHERE status=? ORDER BY created_at DESC",
                (status,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM human_reviews ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def complete_human_review(review_id, final_decision, reviewer_name, notes):
    with get_conn() as conn:
        conn.execute(
            """UPDATE human_reviews SET status='completed', final_decision=?,
               reviewer_name=?, notes=?, reviewed_at=? WHERE id=?""",
            (final_decision, reviewer_name, notes, now(), review_id),
        )
