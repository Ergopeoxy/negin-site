# negin.amou — personal site

A modular Flask personal website: professional portfolio + writings, with a
mouse-reactive point-cloud background.

## Run locally

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                   # http://127.0.0.1:5000
```

## How content works (no code changes needed)

Everything you'd normally edit lives in `content/`:

| File | What it controls |
|---|---|
| `content/profile.json` | Name, tagline, email, social links |
| `content/sections.json` | Which sections show on the home page, and in what order |
| `content/experience.json` | Jobs (each with role, period, bullet points, tags) |
| `content/education.json` | Degrees & awards |
| `content/skills.json` | Skill groups |
| `content/writings/*.md` | Blog posts |

### Add a blog post

Create `content/writings/my-post.md`:

```markdown
---
title: My post title
date: 2026-08-15
summary: One-line summary shown on cards.
tags: unity, point clouds
---

Your Markdown content here. Code blocks, tables, and lists all work.
```

It appears automatically at `/writings/my-post/` and in the writings section.

### Hide / reorder / add sections

Open `content/sections.json`:

- **Hide** a section: set `"enabled": false`
- **Reorder**: move entries up or down in the list
- **Remove from nav** but keep on the page: set `"nav": false`
- **Add a new section type**: create `templates/sections/yourthing.html`
  (copy an existing one as a starter) and add an entry pointing at it.
  If it needs data, add a JSON file and reference it with `"data"`.

## Point-cloud background

`static/js/pointcloud.js` — tuning knobs are at the top in `CONFIG`
(point count, shape size, rotation speed, mouse force, colors, morph timing).
Shapes morph between a sphere, torus, cube, and pyramid. It respects
`prefers-reduced-motion` (renders a static frame) and pauses in hidden tabs.

## Deploying

Any Flask host works (Render, Railway, Fly.io, a VPS with gunicorn):

```bash
pip install gunicorn
gunicorn app:app
```
