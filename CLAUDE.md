# CLAUDE.md

This file gives guidance to Claude Code (and other AI assistants) when working in this repository.

## Current state of the repository

> **This repository is currently an empty scaffold.** At the time of writing it contains only this `CLAUDE.md` and a placeholder `README.md` (`# cl_code-app`). There is no application source code, build configuration, dependency manifest, test suite, or CI pipeline yet.

Because there is no codebase to describe, most of the sections below are **forward-looking guidance**: they tell you how to behave while the project is empty and what to fill in as soon as real code lands. Do not document structure, commands, or conventions that do not actually exist — keep this file honest and update it the moment the project gains substance.

## What to do first when real code arrives

When the repository starts to hold an actual application, update this file with the concrete details. The most valuable things to capture (in rough priority order):

1. **Project type and stack** — language(s), framework(s), and runtime versions. Confirm by reading the dependency manifest (e.g. `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`) rather than guessing.
2. **How to install dependencies** — the exact command (`npm install`, `pip install -e .`, `go mod download`, etc.).
3. **How to build** — the build command and any required environment variables.
4. **How to run the app locally** — entrypoint, dev server command, default port.
5. **How to run tests and linters** — the exact commands, and how to run a single test (this is the highest-leverage thing for an AI assistant to know).
6. **Directory layout** — a short map of the top-level directories and what lives in each.
7. **Key conventions** — formatting/lint rules, naming patterns, commit message style, and any project-specific idioms that aren't obvious from the code.

A fast way to regenerate this file once code exists is to re-run the `/init` workflow, which inspects the codebase and drafts an updated `CLAUDE.md`.

## Repository facts (known today)

- **Repository:** `djbigsexy/cl_code-app`
- **Default branch:** `main`
- **README:** `README.md` — currently just the project title.

## Git workflow and branch conventions

This repository is worked on through Claude Code's remote (cloud) execution environment. Keep the following in mind:

- **Do not commit directly to `main`.** Develop on a dedicated feature branch and open changes from there.
- The container is **ephemeral**: the repo is cloned fresh when a session starts and reclaimed afterward. Anything worth keeping must be **committed and pushed** before the session ends.
- **Push with upstream tracking:** `git push -u origin <branch-name>`. On transient network failures, retry a few times with exponential backoff (2s, 4s, 8s, 16s).
- **Prefer fetching specific branches:** `git fetch origin <branch-name>`; pull with `git pull origin <branch-name>`.
- **Do not open a pull request unless explicitly asked.**
- Write clear, descriptive commit messages that explain the intent of the change.

## Guidance for AI assistants

- **Keep this file truthful.** If you add a build system, tests, or a source tree, document them here in the same change. If you remove something, delete its description. An out-of-date `CLAUDE.md` is worse than a short one.
- **Verify before you document.** Read the actual config and source files before writing commands or structure into this file; never copy conventions from memory or from other projects.
- **Match the project once it has a style.** When code and tooling exist, follow the established formatting, naming, and patterns rather than introducing new ones.
- **Don't invent scaffolding.** Because the repo is empty, there are no hidden conventions to honor yet — but resist adding speculative folders, frameworks, or boilerplate that the user hasn't asked for.
