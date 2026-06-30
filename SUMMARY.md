## [2026-06-29 17:00] Commit Summary

**Change Type:** Feature
**Scope:** Website + Docker

**Summary:**
Added a single-page website (`index.html`) embedding the TI-84 online calculator in an iframe with a light/dark theme toggle (Tailwind CSS via CDN, persisted to localStorage). Packaged with an Nginx Alpine Dockerfile for one-command hosting. Added README, .gitignore, and TODO documentation.

**Rationale:**
Static site with CDN Tailwind keeps the project simple and dependency-free while still offering a polished, theme-aware UI. Nginx Alpine image is tiny and reliable for serving static content.

**References:**
- TODO.md: 2026-06-29 TI-84 Calculator Website with Theme Toggle and Docker

## [2026-06-29 17:10] Commit Summary

**Change Type:** Docs
**Scope:** README + CONTRIBUTING

**Summary:**
Enhanced README.md with status badges, screenshot placeholders (light/dark), a Contributing section, and an updated project structure. Added CONTRIBUTING.md describing the GitHub Flow workflow, commit conventions, code style, testing expectations, PR checklist, and issue reporting. Added a docs/ folder with a README explaining screenshot capture.

**Rationale:**
A professional README with badges and screenshots makes the project more discoverable and trustworthy. A dedicated CONTRIBUTING.md lowers the barrier for contributors and enforces consistent workflows and commit messages.

**References:**
- README.md: badges, screenshots, contributing link
- CONTRIBUTING.md: GitHub Flow + Conventional Commits