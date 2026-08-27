"""
Generate preview.html (artifact build) from index.html (standalone site).

The artifact host supplies <!doctype>/<html>/<head>/<body>, and its CSP blocks
requests to external hosts - so relative asset paths never resolve. This strips
the document wrapper and inlines every local image as a data: URI.

Run after editing index.html:
    ../.venv/Scripts/python.exe build-preview.py
"""
import base64
import mimetypes
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
SRC = HERE / "index.html"
OUT = HERE / "preview.html"

WRAPPER_PATTERNS = [
    r"^<!doctype html>\s*",
    r"</?html[^>]*>\s*",
    r"</?head>\s*",
    r"</?body>\s*",
    r'<meta charset[^>]*>\s*',
    r'<meta name="viewport"[^>]*>\s*',
]


def inline_asset(match):
    """Replace src="assets/x.png" with a data: URI."""
    attr, path = match.group(1), match.group(2)
    asset = HERE / path
    if not asset.exists():
        print(f"  ! missing asset: {path}", file=sys.stderr)
        return match.group(0)
    mime = mimetypes.guess_type(asset.name)[0] or "application/octet-stream"
    payload = base64.b64encode(asset.read_bytes()).decode("ascii")
    print(f"  + inlined {path} ({asset.stat().st_size // 1024} KB -> {len(payload) // 1024} KB base64)")
    return f'{attr}="data:{mime};base64,{payload}"'


def main():
    html = SRC.read_text(encoding="utf-8")

    for pattern in WRAPPER_PATTERNS:
        html = re.sub(pattern, "", html, flags=re.IGNORECASE)

    html = re.sub(r'\b(src|href)="(assets/[^"]+)"', inline_asset, html)

    OUT.write_text(html.strip() + "\n", encoding="utf-8")

    leftover = [t for t in ("<!doctype", "<html", "<head>", "<body>") if t in html.lower()]
    print(f"  wrapper tags remaining: {leftover or 'none'}")
    print(f"  title present: {'<title>' in html}")
    print(f"  wrote {OUT.name}: {len(html) / 1024:.0f} KB")

    if len(html) > 16 * 1024 * 1024:
        print("  ! exceeds the 16 MB artifact limit", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
