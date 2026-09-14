# ClarityClaim

Multi-Agent AI Insurance Claims Intelligence & Intelligent Routing System.

A working Streamlit application. Every number on screen (claim counts,
confidence scores, routing stats, reports) is computed live from a local
SQLite database as you process real claims — nothing is hard-coded or
faked. It starts empty and fills in as you use it.

## What it does

Submit a claim (form fields + documents + damage photos + an optional
audio statement) and ClarityClaim runs it through a pipeline of
independent AI agents:

1. **Document Agent** — extracts structured facts from claim forms, police
   reports, repair estimates (PDF/DOCX/TXT).
2. **Vision Agent** — analyzes damage photos with a multimodal LLM.
3. **Audio Agent** — analyzes the transcript of a recorded statement.
4. **Missing Information Agent** — flags evidence that's typically required
   for this incident type but wasn't submitted.
5. **Contradiction Engine** — cross-checks agents against each other (e.g.
   "rear impact" vs "front impact") using both a deterministic check and an
   LLM pass, and rates the severity of any conflict.
6. **Multi-Agent Debate** — agents that disagree with the majority reading
   get a second round to argue their case, weighted by their own
   confidence scores.
7. **Adjudicator** — combines everything into a severity rating and a
   joint confidence score (transparent, auditable math — not another
   black-box LLM call).
8. **Explainable AI layer** — writes a short plain-English rationale for
   the decision.
9. **Router** — deterministically routes the claim to Auto-Approval, Human
   Review, or Escalation based on the confidence thresholds you configure
   in Settings.

Every claim, agent finding, contradiction, missing-evidence item, debate
turn, and final decision is persisted, so Evidence Analysis, Reasoning,
Decision & Routing, and Reports can all be revisited later and stay in
sync.

## LLM backends

A glass-effect **LOCAL LLM / CLOUD LLM** toggle sits in the top-right of
every page and controls which backend the agents actually use. The
selection is kept in Streamlit session state and also persisted to the
database, so it survives navigation and app restarts.

- **LOCAL LLM** — calls [Ollama](https://ollama.com) at
  `http://localhost:11434`, model `llama3.1:8b` by default (a
  vision-capable local model is used automatically for the Vision Agent —
  see `.env.example`).
- **CLOUD LLM** — calls the Anthropic API. Requires `ANTHROPIC_API_KEY`.

If a backend is unreachable or unconfigured, the affected agent honestly
reports an error instead of fabricating a result — you'll see this clearly
on the Evidence Analysis page and in the sidebar's System Status panel.

## Setup

```bash
cd clarityclaim
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY if you want Cloud LLM mode,
# and/or make sure Ollama is running for Local LLM mode.
```

### Local LLM (Ollama)

```bash
ollama serve
ollama pull llama3.1:8b
# optional, only needed for the Vision Agent in Local mode:
ollama pull llama3.2-vision
```

### Cloud LLM (Anthropic)

Get an API key from https://console.anthropic.com/ and put it in `.env`
as `ANTHROPIC_API_KEY`.

### Audio transcription (optional)

Automatic speech-to-text needs `faster-whisper`, which isn't in
`requirements.txt` by default because it pulls in a large ML stack:

```bash
pip install faster-whisper
```

Without it, uploading an audio file just prompts you to paste the
transcript by hand — the Audio Agent still runs on that text normally.

## Run

```bash
streamlit run app.py
```

Open the URL Streamlit prints (usually http://localhost:8501).

## Project structure

```
clarityclaim/
├── app.py                    # entry point: navigation + sidebar shell
├── config.py                 # palette, paths, env, default settings
├── db.py                     # SQLite persistence + real aggregate stats
├── requirements.txt
├── .env.example
├── llm/
│   └── client.py             # unified local/cloud LLM client
├── agents/
│   ├── document_agent.py
│   ├── vision_agent.py
│   ├── audio_agent.py
│   ├── missing_evidence_agent.py
│   ├── contradiction_engine.py
│   ├── debate_engine.py
│   ├── adjudicator.py
│   ├── explainability.py
│   ├── router.py
│   └── pipeline.py           # orchestrates the full agent chain
├── components/
│   ├── header.py             # page header + glass LLM toggle
│   └── sidebar.py            # logo + live system status
├── utils/
│   ├── parsing.py            # PDF/DOCX/TXT extraction
│   ├── audio.py              # optional whisper transcription
│   ├── styling.py            # global CSS / color palette
│   └── claim_picker.py       # shared claim selector widget
├── views/                    # one file per sidebar page
│   ├── overview.py
│   ├── claim_intake.py
│   ├── evidence_analysis.py
│   ├── reasoning.py
│   ├── decision_routing.py
│   ├── reports.py
│   └── settings.py
└── data/                     # SQLite DB + uploaded evidence (created at runtime)
```

## Color palette

| Name        | Hex       | Use                                  |
|-------------|-----------|---------------------------------------|
| Café Noir   | `#4C3D19` | primary text                          |
| Kombu Green | `#354024` | sidebar / dark surfaces               |
| Sage Green  | `#9CAF84` | accent — replaces "moss green"        |
| Tan         | `#CFBB99` | borders / secondary surfaces          |
| Bone        | `#E5D7C4` | light backgrounds                     |

## Notes

- This is a working prototype/academic project. The routing thresholds and
  severity model are reasonable defaults, not a substitute for licensed
  claims-adjustment judgment — required actions and confidence scores are
  meant to support a human adjuster, not replace one.
- The database and uploaded files live under `data/`, which is created
  automatically on first run. Delete `data/clarityclaim.db` to reset all
  claims and start fresh.
