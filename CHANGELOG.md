# Changelog

All notable changes to the SprintMind AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Upcoming Releases

#### [v0.5.0] - Sprint 4 (Planned)
* AI Risk Management Module.
* Advanced Analytics & Slack Notifications.

#### [v0.4.0] - Sprint 3 (Planned)
* AI-driven Sprint Planning Assistant.
* APScheduler automated cron jobs.

#### [v0.3.0] - Sprint 2 (Planned)
* Workspace, Project, and Task Management.
* Kanban Board UI and drag-and-drop support.

---

## [v0.2.0] - 2026-07-11

### Added
* Completed Phase 6 Authentication using Supabase Auth.
* Created FastAPI backend proxies for signup (`POST /signup`) and login (`POST /login`).
* Added custom Pydantic validators checking email patterns, password lengths, and matching values.
* Created user profiles auto-sync triggers and RLS permissions on postgres databases.
* Integrated E2E browser verification test suites via Playwright.

---

## [v0.1.0] - 2026-07-10

### Added
* Foundational directory configurations, FastAPI gateway infrastructure, and React Vite skeletons.
* Connected Supabase Client SDK connections.
* Added logging middlewares and generic health check status endpoints.
