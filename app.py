"""
Negin Amou — personal site
Run:  pip install -r requirements.txt
      flask run          (or: python app.py)
"""
from flask import Flask, render_template, abort, Response, request, url_for
from pathlib import Path
from content.loader import load_enabled_sections, load_writings
from flask import send_from_directory
import os
from content.loader import (
    load_profile,
    load_enabled_sections,
    load_writings,
    get_writing,
)

app = Flask(__name__)


@app.context_processor
def inject_profile():
    """Profile (name, tagline, social links) is available in every template."""
    return {"profile": load_profile()}


@app.route("/")
def index():
    sections = load_enabled_sections()
    writings = load_writings()
    return render_template("index.html", sections=sections, writings=writings)

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, "static", "img"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon"
    )

@app.route("/writings/")
def writings_index():
    return render_template("writings_index.html", writings=load_writings())

@app.route("/lounge/")
def lounge():
    return render_template("lounge.html")

@app.route("/travels/")
def travels():
    return render_template("travels.html")

@app.route("/writings/<slug>/")
def writing_post(slug):
    post = get_writing(slug)
    if post is None:
        abort(404)
    return render_template("writing_post.html", post=post)

@app.route("/isfahan/")
def isfahan():
    return render_template("isfahan.html")

# @app.route("/sitemap.xml")
# def sitemap():
#     """Generated on the fly — tells Google every page on the site."""
#     pages = [url_for("index", _external=True),
#              url_for("writings_index", _external=True)]
#     pages += [url_for("writing_post", slug=p["slug"], _external=True)
#               for p in load_writings()]
#     xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
#     xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
#     xml += "".join(f"<url><loc>{u}</loc></url>\n" for u in pages)
#     xml += "</urlset>"
#     return Response(xml, mimetype="application/xml")





@app.route("/sitemap.xml")
def sitemap():
    base = request.url_root.rstrip("/")

    # --- standalone pages (their own routes) ---
    # (endpoint name, path) — edit if your route paths differ
    standalone = [
        "/",              # homepage
        "/travels/",
        "/isfahan-diorama/",
        "/library/",
        "/lounge/",
        "/remembrance/",
        "/writings/",     # the all-writings index page
    ]

    urls = []

    # homepage carries the profile image so Google can index it
    urls.append({
        "loc": f"{base}/",
        "img": f"{base}/static/img/negin.jpg",   # <-- your real profile image path
        "img_title": "Negin Amou",
    })

    # the rest of the standalone pages
    for path in standalone:
        if path == "/":
            continue
        urls.append({"loc": f"{base}{path}"})

    # --- every writing, pulled automatically ---
    # load_writings() should return your writing objects; we use each slug.
    try:
        for w in load_writings():
            slug = w.get("slug") or w.get("id")
            if slug:
                urls.append({"loc": f"{base}/writings/{slug}/"})
    except Exception:
        pass  # if writings can't load, still return a valid sitemap

    # --- build the XML ---
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for u in urls:
        parts.append("  <url>")
        parts.append(f"    <loc>{u['loc']}</loc>")
        if u.get("img"):
            parts.append("    <image:image>")
            parts.append(f"      <image:loc>{u['img']}</image:loc>")
            if u.get("img_title"):
                parts.append(f"      <image:title>{u['img_title']}</image:title>")
            parts.append("    </image:image>")
        parts.append("  </url>")
    parts.append("</urlset>")

    return Response("\n".join(parts), mimetype="application/xml")


@app.route("/robots.txt")
def robots():
    """Generated on the fly — tells crawlers they're welcome, and where the sitemap is."""
    return Response(
        f"User-agent: *\nAllow: /\nSitemap: {request.url_root}sitemap.xml",
        mimetype="text/plain",
    )


@app.errorhandler(404)
def not_found(_):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)