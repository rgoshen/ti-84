# Contributing to TI-84 Calculator

Thanks for your interest in contributing! This guide explains how to get started and the standards we follow.

## Code of Conduct

Be respectful and inclusive in all interactions. Professional, civil communication is expected at all times.

## Getting Started

1. **Fork** the repository and clone your fork.
2. Create a feature branch following **GitHub Flow**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes locally (see the [Running without Docker](README.md#running-without-docker) section).
4. Verify the Docker build still works:

   ```bash
   docker build -t ti-84 .
   docker run -d --name graphing-calculator -p 8080:80 ti-84
   ```

5. Commit your changes using **Conventional Commits**:

   ```
   feat: add new feature
   fix: resolve bug in theme toggle
   docs: update README
   refactor: restructure header layout
   chore: update dependencies
   ```

6. Push your branch and open a **Pull Request** against `main`.
7. Link the PR to any related issue and include a description, rationale, and screenshots (if UI).

## Branching Model

We follow **GitHub Flow**:

- Branch off `main`.
- One feature/fix per branch.
- Open a PR, get review, then merge.
- Delete the branch after merge.

Branch naming:

- `feature/` — new functionality
- `fix/` — bug fixes
- `docs/` — documentation changes
- `chore/` — maintenance / tooling

## Commit Conventions

- Use **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
- Keep commits small and atomic.
- Do not include co-author or AI-generation tags.
- Example: `feat(ui): add keyboard shortcut for theme toggle`

## Code Style

- No commented-out or dead code.
- Precise, domain-driven naming.
- Short, single-purpose functions.
- Follow existing formatting in the file.
- Do not add comments unless explaining *why* something non-obvious is done.

## Testing

- For static changes, manually verify both light and dark themes.
- If you add JS logic, prefer deterministic unit tests.
- Ensure the Docker image builds and serves HTTP 200 before opening a PR.

## Pull Request Checklist

- [ ] Branch follows naming convention
- [ ] Commits follow Conventional Commits
- [ ] Docker build succeeds (`docker build -t ti-84 .`)
- [ ] Both light and dark themes verified
- [ ] README / docs updated if behavior changed
- [ ] No secrets, credentials, or PII committed

## Reporting Issues

Open an issue with:

- A clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS version
- Screenshots, if applicable

## License

By contributing, you agree your contributions will be licensed under the project's MIT License.