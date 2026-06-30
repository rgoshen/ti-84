# Screenshots

Place screenshots of the running website here.

## Required files

- `screenshot-light.png` — a page (TI-84 or Graphing Calculator Online) in light theme
- `screenshot-dark.png` — a page (TI-84 or Graphing Calculator Online) in dark theme

## How to capture

1. Run the site: `docker run -d --name graphing-calculator -p 8084:80 ti-84`
2. Open <http://localhost:8084> (TI-84) and <http://localhost:8084/graphing.html> (Graphing Calculator Online).
3. Capture the light theme, then toggle to dark and capture again.
4. Save the PNGs in this folder; they are referenced from `README.md`.