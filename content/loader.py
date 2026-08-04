"""
Content loading layer.

All site content lives in the content/ folder as JSON and Markdown.
The Flask app never hard-codes content — it only reads what's here.

  profile.json      -> name, tagline, contact, social links
  sections.json     -> which sections appear on the home page, and in what order
  experience.json   -> work history
  education.json    -> degrees & awards
  skills.json       -> skill groups
  writings/*.md     -> blog posts (Markdown with a small front-matter block)

To add a post:  drop a .md file in content/writings/ (see the samples).
To hide a section:  set "enabled": false in sections.json.
To reorder sections: change their order in the sections.json list.
"""
import json
import re
from datetime import date
from pathlib import Path

import markdown

CONTENT_DIR = Path(__file__).parent
WRITINGS_DIR = CONTENT_DIR / "writings"

_MD = markdown.Markdown(extensions=["fenced_code", "tables", "smarty"])


def _load_json(name):
    with open(CONTENT_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def load_profile():
    return _load_json("profile.json")


def load_enabled_sections():
    """Return enabled sections in list order, with their data attached.

    Each entry in sections.json looks like:
      { "id": "experience", "template": "sections/experience.html",
        "title": "Experience", "enabled": true, "data": "experience.json" }

    "data" is optional — if present, that JSON file is loaded into section["items"].
    """
    sections = []
    for section in _load_json("sections.json"):
        if not section.get("enabled", True):
            continue
        if "data" in section:
            section["items"] = _load_json(section["data"])
        sections.append(section)
    return sections


# ---------------------------------------------------------------- writings ---

_FRONT_MATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_post(path):
    """Parse one Markdown file with a simple key: value front-matter block."""
    raw = path.read_text(encoding="utf-8")
    meta = {}
    match = _FRONT_MATTER.match(raw)
    body = raw
    if match:
        body = raw[match.end():]
        for line in match.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip().lower()] = value.strip()

    _MD.reset()
    return {
        "slug": path.stem,
        "title": meta.get("title", path.stem.replace("-", " ").title()),
        "date": meta.get("date", ""),
        "summary": meta.get("summary", ""),
        "tags": [t.strip() for t in meta.get("tags", "").split(",") if t.strip()],
        "html": _MD.convert(body),
    }


def load_writings(limit=None):
    """All posts, newest first (front-matter dates should be YYYY-MM-DD)."""
    posts = [_parse_post(p) for p in sorted(WRITINGS_DIR.glob("*.md"))]
    posts.sort(key=lambda p: p["date"] or str(date.min), reverse=True)
    return posts[:limit] if limit else posts


def get_writing(slug):
    path = WRITINGS_DIR / f"{slug}.md"
    return _parse_post(path) if path.exists() else None
