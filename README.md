# donnoban.dev

Personal portfolio site — static HTML, CSS, and vanilla JS, deployed with GitHub Pages
to [donnoban.dev](https://donnoban.dev).

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | All page content — hero, about, experience, skills, projects, contact |
| `styles.css` | Design tokens (`:root`), layout, and responsive rules |
| `main.js` | Topographic background, mobile nav, scroll reveal, active nav link, copy-to-clipboard |
| `DM-Resume.pdf` | Resume, linked from the contact section and footer |
| `CNAME` | Custom domain for GitHub Pages |

## Local development

No build step or dependencies. Open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Updating content

- **Experience** — edit the `.role` blocks in `index.html`. Each row carries an accent class (`a2`, `a3`)
  that colors its numeral and bullets. Keep the resume PDF in sync.
- **Projects** — duplicate a `.project-card` article. Images are `600x340`-ish and cropped to fill.
- **Colors and spacing** — change the custom properties under `:root` in `styles.css`; everything reads from them.

Images are committed at web-ready sizes. Run new photos through `sips -Z 800 -s formatOptions 80` before adding them.
