# degzarbiz.com

Personal site for Diego "Degz" Arbiz Jr. — AI Systems Developer.
Static, no build step, no dependencies. Deploys to GitHub Pages as-is.

## Files

| Path | What it is |
|------|-----------|
| `index.html` | The site. Self-contained — all CSS inline, only Google Fonts is external. |
| `assets/` | Headshot, project screenshots, brand marks. |
| `resume.json` | [JSON Resume](https://jsonresume.org/) schema. Parsed by recruiting tools. |
| `resume.txt` | Plain-text résumé. `curl degzarbiz.com/resume.txt` |
| `llms.txt` | Plain-language summary for AI agents and LLM crawlers. |
| `robots.txt`, `sitemap.xml` | Search indexing. **Both contain a placeholder domain — update before deploying.** |
| `preview.html` | Generated artifact build. Not deployed. |
| `build-preview.py` | Regenerates `preview.html` from `index.html`. |

## Deploying to GitHub Pages

Publish from a repo named `degz12348-tech.github.io` and the site is served at
the repo root, which is what the absolute paths in `index.html` (`/llms.txt`,
`/resume.json`) expect.

```bash
cd portfolio
git init
git add .
git commit -m "Personal site"
git branch -M main
git remote add origin git@github.com:degz12348-tech/degz12348-tech.github.io.git
git push -u origin main
```

Then: **Settings → Pages → Source: `main`, folder `/ (root)`**.
Live at `https://degz12348-tech.github.io` within a minute or two.

> If you use any other repo name, the site is served from a subpath
> (`/<repo>/`) and the absolute paths above will 404. Either rename the repo
> or change those links to relative paths.

`.nojekyll` is included so GitHub serves the files as-is rather than running
them through Jekyll.

## Custom domain

1. Register the domain (`degzarbiz.com` is the one assumed throughout).
2. Add a `CNAME` file at the repo root containing just the domain.
3. DNS — apex domain, four A records:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   (or a `CNAME` to `degz12348-tech.github.io` for a `www` subdomain).
4. Settings → Pages → Custom domain, then tick **Enforce HTTPS**.
5. Update the placeholder domain in `robots.txt`, `sitemap.xml`, and the
   `canonical` / JSON-LD blocks in `index.html`.

## Editing

Edit `index.html` directly. Everything marked with an HTML comment is a
placeholder or a note about something that still needs verifying.

After editing, regenerate the artifact build:

```bash
../.venv/Scripts/python.exe build-preview.py
```

## Not possible on GitHub Pages

Static hosting can't do content negotiation or run code, so these need a
server (Railway, Cloudflare Workers, a VPS):

- Serving a terminal résumé to `curl` while browsers get HTML
- An MCP endpoint so agents can query the résumé as a tool
- `POST /api/hire` or any other write endpoint

`resume.txt` is the static substitute for the first one — it just needs the
full path rather than being served automatically.
