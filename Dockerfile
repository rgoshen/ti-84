# Multi-stage build: compile the static Astro site, then serve it with nginx.

# Stage 1 — build the static site with Node.
FROM node:24-alpine AS build
WORKDIR /app

# Install pinned dependencies first so this layer caches across source changes.
COPY package*.json ./
RUN npm ci

# Copy the source and build the static output to /app/dist.
COPY . .

# Build-time site configuration. Consumed by src/config.ts via import.meta.env.PUBLIC_*.
# Override per environment with `--build-arg PUBLIC_...` (see docker-compose.yml / .env.example).
ARG PUBLIC_SITE_TITLE_TI84="TI-84 Calculator"
ARG PUBLIC_SITE_TITLE_GRAPHING="Graphing Calculator Online"
ARG PUBLIC_TI84_IFRAME_SRC="https://ti84calc.com/ti84calc"
ARG PUBLIC_THEME_DEFAULT="dark"
ENV PUBLIC_SITE_TITLE_TI84=$PUBLIC_SITE_TITLE_TI84 \
    PUBLIC_SITE_TITLE_GRAPHING=$PUBLIC_SITE_TITLE_GRAPHING \
    PUBLIC_TI84_IFRAME_SRC=$PUBLIC_TI84_IFRAME_SRC \
    PUBLIC_THEME_DEFAULT=$PUBLIC_THEME_DEFAULT

RUN npm run build

# Stage 2 — serve the built static site with nginx.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
