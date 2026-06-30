# TI-84 Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Nginx%20Alpine-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/_/nginx)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-CDN-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Made with HTML](https://img.shields.io/badge/Made%20with-HTML-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)

A simple, professional website with a light/dark theme toggle built on Tailwind CSS and served via Docker. Includes two pages accessible from a shared navigation menu:

- **TI-84 Calculator** — embeds the online TI-84 calculator
- **Graphing Calculator Online** — a content page describing the in-browser graphing calculator (equation plotting, multiple functions, interactive controls, cross-device support, algebra/calculus/trigonometry features)

## Screenshots

> Replace the placeholder images below with actual screenshots of the running site.

### Light theme

![Light theme screenshot](docs/screenshot-light.png)

### Dark theme

![Dark theme screenshot](docs/screenshot-dark.png)

> Capture screenshots from both the TI-84 page and the Graphing Calculator Online page.

## Features

- Light and dark themes (remembers your choice via `localStorage`)
- Shared navigation menu between both pages
- Responsive, clean layout
- Single static HTML files — no build step required
- Served by Nginx inside a Docker container

## Prerequisites

- [Docker](https://www.docker.com/) installed (Docker Compose is bundled with modern Docker)

## Running with Docker Compose (recommended)

A `docker-compose.yml` is included with sensible defaults, so you can simply:

```bash
docker compose up -d
```

Open <http://localhost:8084> in your browser.

### Configurable environment variables

Defaults are baked into `docker-compose.yml`. Override any of them by creating a `.env` file or by exporting them in your shell before running `docker compose up`.

| Variable | Default | Description |
|---|---|---|
| `HOST_PORT` | `8084` | Host port mapped to the container's port 80 |
| `SITE_TITLE_TI84` | `TI-84 Calculator` | Browser tab title and page heading for the TI-84 page |
| `SITE_TITLE_GRAPHING` | `Graphing Calculator Online` | Browser tab title and page heading for the Graphing Calculator page |
| `THEME_DEFAULT` | `dark` | Default theme for first-time visitors (`dark` or `light`) — users can still toggle, and their choice is saved in `localStorage` |
| `TI84_IFRAME_SRC` | `https://ti84calc.com/ti84calc` | Source URL for the embedded TI-84 iframe |

### Overriding defaults with a `.env` file

`.env.example` is a template listing every variable with its default value. It is safe to copy and edit. The real `.env` file is gitignored so your local overrides never get committed.

1. Copy the template:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your own values:
   ```env
   HOST_PORT=9090
   SITE_TITLE_TI84=My Custom TI-84
   THEME_DEFAULT=light
   TI84_IFRAME_SRC=https://example.com/calc
   ```
3. Run — Docker Compose reads `.env` automatically:
   ```bash
   docker compose up -d
   ```

> Tip: changes to `.env` only apply on a fresh start. If the container is already running, recreate it: `docker compose down && docker compose up -d`.

You can also override a single value inline without a `.env` file:
   ```bash
   HOST_PORT=9090 docker compose up -d
   ```

Stop and remove the container:

```bash
docker compose down
```

## Running locally with Docker (without Compose)

```bash
docker build -t ti-84 .
docker run -d --name graphing-calculator -p 8084:80 \
  -e SITE_TITLE_TI84="TI-84 Calculator" \
  -e SITE_TITLE_GRAPHING="Graphing Calculator Online" \
  -e THEME_DEFAULT=dark \
  -e TI84_IFRAME_SRC="https://ti84calc.com/ti84calc" \
  ti-84
```

The `-d` flag runs the container in detached (headless) mode in the background.

Open <http://localhost:8084> in your browser. View logs with:

```bash
docker logs graphing-calculator
```

To stop and remove the container when you're done:

```bash
docker stop graphing-calculator
docker rm graphing-calculator
```

## Running without Docker

Open `index.html` (TI-84) or `graphing.html` (Graphing Calculator Online) directly in any modern browser. No build step is required since Tailwind is loaded via CDN.

## Project structure

```
.
├── index.html            # TI-84 Calculator page (template with env var placeholders)
├── graphing.html         # Graphing Calculator Online page (template with env var placeholders)
├── Dockerfile            # Nginx Alpine + gettext entrypoint that envsubst's the templates
├── docker-entrypoint.sh  # Substitutes env vars into HTML at container start
├── docker-compose.yml    # Compose file with default env vars
├── .env.example          # Example environment file (copy to .env to override)
├── docs/                 # Screenshots and assets
├── CONTRIBUTING.md       # How to contribute
└── README.md
```

## Tech

- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [Nginx Alpine](https://hub.docker.com/_/nginx) Docker image

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on the workflow, code style, and how to submit a pull request.

## License

This project embeds a third-party calculator from [ti84calc.com](https://ti84calc.com). All rights to the embedded content belong to their respective owners. The project's own source code is distributed under the MIT License.