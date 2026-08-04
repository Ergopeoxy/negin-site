"""
Negin Amou — personal site
Run:  pip install -r requirements.txt
      flask run          (or: python app.py)
"""
from flask import Flask, render_template, abort

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
    """Home page: renders every enabled section, in order.

    To add / remove / reorder sections, edit content/sections.json —
    no template or Python changes needed unless it's a brand-new section type.
    """
    sections = load_enabled_sections()
    writings = load_writings(limit=3)  # latest posts for the writings preview
    return render_template("index.html", sections=sections, writings=writings)


@app.route("/writings/")
def writings_index():
    """Full archive of writings."""
    return render_template("writings_index.html", writings=load_writings())


@app.route("/writings/<slug>/")
def writing_post(slug):
    post = get_writing(slug)
    if post is None:
        abort(404)
    return render_template("writing_post.html", post=post)


@app.errorhandler(404)
def not_found(_):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
