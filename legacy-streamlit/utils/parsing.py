"""
Extracts plain text from uploaded claim documents so agents can read them.
Supports PDF, DOCX, and plain text. Unsupported types are stored as
evidence but return an empty string with a note.
"""


def extract_text(filepath, filename):
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    try:
        if ext == "pdf":
            return _extract_pdf(filepath)
        if ext == "docx":
            return _extract_docx(filepath)
        if ext in ("txt", "md", "csv"):
            with open(filepath, "r", errors="ignore") as f:
                return f.read()
    except Exception as e:
        return f"[Could not extract text from {filename}: {e}]"

    return f"[{filename} uploaded — text extraction not supported for .{ext} files]"


def _extract_pdf(filepath):
    import pdfplumber
    text_parts = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def _extract_docx(filepath):
    import docx
    d = docx.Document(filepath)
    return "\n".join(p.text for p in d.paragraphs).strip()
