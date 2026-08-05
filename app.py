"""
Negin Amou — personal site
Run:  pip install -r requirements.txt
      flask run          (or: python app.py)
"""
from flask import Flask, render_template, abort, Response, request, url_for

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
    writings = load_writings(limit=3)
    return render_template("index.html", sections=sections, writings=writings)


@app.route("/writings/")
def writings_index():
    return render_template("writings_index.html", writings=load_writings())


@app.route("/writings/<slug>/")
def writing_post(slug):
    post = get_writing(slug)
    if post is None:
        abort(404)
    return render_template("writing_post.html", post=post)


@app.route("/sitemap.xml")
def sitemap():
    """Generated on the fly — tells Google every page on the site."""
    pages = [url_for("index", _external=True),
             url_for("writings_index", _external=True)]
    pages += [url_for("writing_post", slug=p["slug"], _external=True)
              for p in load_writings()]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "".join(f"<url><loc>{u}</loc></url>\n" for u in pages)
    xml += "</urlset>"
    return Response(xml, mimetype="application/xml")


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