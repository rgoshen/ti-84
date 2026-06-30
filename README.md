# TI-84 Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Nginx%20Alpine-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/_/nginx)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-CDN-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Made with HTML](https://img.shields.io/badge/Made%20with-HTML-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)

A simple, professional single-page website that embeds the TI-84 online calculator with a light/dark theme toggle built on Tailwind CSS and served via Docker.

## Screenshots

> Replace the placeholder images below with actual screenshots of the running site.

### Light theme

![Light theme screenshot](docs/screenshot-light.png)

### Dark theme

![Dark theme screenshot](docs/screenshot-dark.png)

## Features

- Light and dark themes (remembers your choice via `localStorage`)
- Responsive, clean layout
- Single static `index.html` — no build step required
- Served by Nginx inside a Docker container

## Prerequisites

- [Docker](https://www.docker.com/) installed

## Running locally with Docker

```bash
docker build -t ti-84 .
docker run --name graphing-calculator -p 8080:80 ti-84
```

Open <http://localhost:8080> in your browser.

To stop and remove the container when you're done:

```bash
docker stop graphing-calculator
docker rm graphing-calculator
```

## Running without Docker

Open `index.html` directly in any modern browser. No build step is required since Tailwind is loaded via CDN.

## Project structure

```
.
├── index.html        # The website (Tailwind via CDN, theme toggle, embedded iframe)
├── Dockerfile        # Nginx Alpine image serving index.html
├── docs/             # Screenshots and assets
├── CONTRIBUTING.md   # How to contribute
└── README.md
```

## Tech

- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [Nginx Alpine](https://hub.docker.com/_/nginx) Docker image

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on the workflow, code style, and how to submit a pull request.

## License

This project embeds a third-party calculator from [ti84calc.com](https://ti84calc.com). All rights to the embedded content belong to their respective owners. The project's own source code is distributed under the MIT License.