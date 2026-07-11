# ADR-001: Clean Architecture & Decoupled Frontend Gateway Pattern

## Status
Approved

## Context
We need to design a scalable, secure, and easily maintainable structure for SprintMind AI that supports:
1.  Clear separation of concerns between user interface logic, business endpoints validation, and relational database data schemas.
2.  Flexible local-development workflows that handle offline mock runs in the absence of credentials.
3.  Secure token-based auth flows that do not expose service role keys to client-side browsers.

## Decision
We adopted a Decoupled Gateway Pattern with Clean Architecture:
*   **FastAPI Backend Gateway**: Serves as the single API router. All business validation, database queries, and third-party integrations (Supabase, Gemini AI) are executed server-side.
*   **Token-Based JWT Validation**: The client passes the Bearer JWT from Supabase Auth in headers. The backend validates this token against Supabase user records to authenticate requests statelessly.
*   **Database Trigger Profile Sync**: Auth user registrations are handled by Supabase. A Postgres trigger automatically populates the `public.user_profiles` schema table, keeping metadata in sync securely.
*   **Zustand Frontend State Management**: Tracks active session tokens in the React client, coordinating route protection and auto-sync checks.

## Consequences
*   **Pros**:
    - High security: Database service role keys are kept safe on the backend.
    - Testability: Enables independent unit testing (FastAPI endpoints via Pytest) and E2E browser testing (React client via Playwright).
    - Separation of concerns: Frontend is strictly presentation; backend strictly handles business logic and validations.
*   **Cons**:
    - Increased network hops: Signups and logins route from Client -> Backend Gateway -> Supabase Auth instead of direct client-to-Supabase connections. (This delay is mitigated by caching and small payload sizes).
