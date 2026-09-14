"""
Audio transcription. Uses faster-whisper if it's installed; otherwise
returns None so the caller can prompt the user to paste/edit a transcript
by hand instead. We never fabricate a transcript.
"""

_MODEL = None


def whisper_available():
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def transcribe(filepath):
    """Returns (text, error). error is None on success."""
    global _MODEL
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None, ("faster-whisper is not installed, so audio can't be "
                       "auto-transcribed. Install it (pip install faster-whisper) "
                       "or paste the statement transcript manually below.")

    try:
        if _MODEL is None:
            _MODEL = WhisperModel("base", device="cpu", compute_type="int8")
        segments, _info = _MODEL.transcribe(filepath)
        text = " ".join(seg.text.strip() for seg in segments)
        return text.strip(), None
    except Exception as e:
        return None, f"Transcription failed: {e}"
