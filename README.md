# TI-84 Calculator

A simple, professional single-page website that embeds the TI-84 online calculator with a light/dark theme toggle built on Tailwind CSS and served via Docker.

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
docker run -p 8080:80 ti-84
```

Open <http://localhost:8080> in your browser.

## Running without Docker

Open `index.html` directly in any modern browser. No build step is required since Tailwind is loaded via CDN.

## Project structure

```
.
├── index.html      # The website (Tailwind via CDN, theme toggle, embedded iframe)
├── Dockerfile       # Nginx Alpine image serving index.html
└── README.md
```

## Tech

- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [Nginx Alpine](https://hub.docker.com/_/nginx) Docker image

## License

This project embeds a third-party calculator from [ti84calc.com](https://ti84calc.com). All rights to the embedded content belong to their respective owners.