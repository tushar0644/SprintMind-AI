# Project Foundation Specification: SprintMind AI
## Phase 5: Codebase Architecture & Bootstrapping Guide
**Document Version:** 1.0.0  
**Author:** Staff Software Engineer & Staff AI Solutions Architect (ex-Microsoft)  
**Date:** July 10, 2026  
**Status:** Approved for Bootstrapping  

---

## 1. Repository Structure

SprintMind AI uses a monorepo structure designed to isolate frontend assets from backend service code, making it easy for a single developer to manage and deploy the applications independently.

```
sprintmind-ai/
├── .github/                    # Git workflows and templates
├── frontend/                   # React Single-Page Application (Vercel)
│   ├── public/                 # Static asset directory
│   ├── src/                    # Source files
│   ├── .env.example            # Sample client env config
│   ├── package.json            # NPM dependencies
│   ├── tsconfig.json           # TS compile settings
│   └── vite.config.ts          # Vite configuration
│
├── backend/                    # FastAPI Web Application (Render)
│   ├── app/                    # Python package core
│   │   ├── api/                # API router layer
│   │   ├── core/               # App configuration & security
│   │   ├── models/             # Database ORM classes
│   │   ├── schemas/            # Pydantic data schemas
│   │   ├── services/           # Business logic & AI integrations
│   │   └── main.py             # Server instantiation
│   ├── prompts/                # Version-controlled AI prompts
│   ├── .env.example            # Sample server env config
│   ├── requirements.txt        # PIP dependencies
│   └── run.py                  # Entrypoint runner script
│
├── database/                   # Schema migrations & documentation
└── docs/                       # Specifications & architecture docs
```

---

## 2. Frontend Folder Structure

The React application uses a modular, directory-based layout that isolates views, data layers, and state stores.

```
frontend/src/
├── assets/                     # Images, brand icons, global CSS files
├── components/                 # Reusable, atomic UI components
│   ├── ui/                     # Basic design tokens (Button, Input, Badge)
│   ├── board/                  # Kanban board specific components
│   └── chat/                   # AI chat components
├── context/                    # Context hooks for system scopes (e.g., Auth)
├── hooks/                      # Custom hooks wrapping system actions
├── layouts/                    # Structural screen shells (e.g., DashboardLayout)
├── pages/                      # Target routing page containers
├── services/                   # Axios API request clients
├── store/                      # Zustand global state modules
├── types/                      # Global TypeScript definitions
└── utils/                      # Formatter functions and helpers
```

---

## 3. Backend Folder Structure

The FastAPI codebase enforces a clean separation of concern between endpoints, business services, and database schemas.

```
backend/app/
├── api/                        # HTTP routers
│   ├── auth.py                 # Authentication endpoints
│   ├── projects.py             # Project CRUD controller
│   └── tasks.py                # Task CRUD controller
├── core/                       # Core system files
│   ├── config.py               # Pydantic environment configuration
│   ├── logging.py              # Central log configuration
│   └── security.py             # Token encoding & verification
├── models/                     # Database models
├── schemas/                    # Pydantic models for validation
├── services/                   # Core business logic handlers
│   ├── db_service.py           # Database transaction service
│   └── gemini_service.py       # Gemini API client wrapper
├── utils/                      # Math and date helpers
└── main.py                     # App entry point
```

---

## 4. Environment Variable Strategy

SprintMind AI isolates configurations from code using environment variables, enforcing strict security parameters:

### 1. Variables Strategy
*   **Production vs. Development**: Environment variables are never stored in version control. Instead, `.env.example` templates document all required keys.
*   **Client-Side Scoping**: Vite requires client variables to be prefixed with `VITE_` (e.g., `VITE_SUPABASE_URL`). Any variables without this prefix are ignored at build time to prevent accidental credential leaks.
*   **Server-Side Isolation**: Backend keys (such as `GEMINI_API_KEY` and database service credentials) must not contain client-side prefixes, ensuring they remain inaccessible to the frontend build.

### 2. Variable Loading
*   *Frontend*: Vite automatically loads variables from a `.env` file into `import.meta.env` during development.
*   *Backend*: The FastAPI application uses Pydantic's `Settings` class (from `pydantic-settings`) to read values from a `.env` file and validate their types at startup.

---

## 5. Configuration Management

Configurations are managed using structured, type-safe models to prevent runtime errors.

### 5.1 Backend: Pydantic Settings
The backend uses a central configuration class to load and validate environment variables:

```python
# Conceptual representation of backend configuration loading
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    GEMINI_API_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()
```

### 5.2 Frontend: Config Mapping
The React frontend maps environment variables to a single configuration object. This isolates environment lookups and provides default values:

```typescript
// Conceptual representation of frontend configuration mapping
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  environment: import.meta.env.MODE || "development",
};
```

---

## 6. Logging Strategy

The backend uses a structured logging architecture to support diagnostics and debugging.

*   **Engine**: Built using Python’s standard `logging` library, configured during FastAPI application startup.
*   **Format**: Logs use a structured text format containing:
    `[Timestamp] [Log Level] [Module] - [Message]`
*   **Levels**:
    *   `INFO`: Tracks core system events (e.g., startup, database connections).
    *   `WARNING`: Logs non-critical issues (e.g., slow API responses, query retries).
    *   `ERROR`: Logs failed operations (e.g., database timeouts, failed LLM calls), including stack traces.
*   **Handling**: Logs are written to standard output (`stdout`), allowing Render to capture and centralize them in the dashboard console.

---

## 7. Error Handling Strategy

SprintMind AI implements a unified error-handling framework across both the frontend and backend.

### 7.1 Backend Error Interceptors
The backend uses custom FastAPI exception handlers to format error responses consistently:

*   **Validation Errors**: Invalidation checks from Pydantic automatically return a `422 Unprocessable Entity` status code, containing details on the missing or incorrect fields.
*   **System Exceptions**: Unhandled database, file, or LLM errors are caught by global middleware, which logs the error trace and returns a structured `500 Internal Server Error` response.
*   **Structured API Responses**: API errors return a standard JSON payload format:
    ```json
    {
      "detail": {
        "code": "ERROR_CODE",
        "message": "A descriptive error message."
      }
    }
    ```

### 7.2 Frontend Error Handling
The frontend intercepts and displays errors gracefully:

*   **Axios Interceptors**: Axios response interceptors monitor API responses. If a `401 Unauthorized` status is detected, the interceptor automatically clears the session and redirects the user to the login screen.
*   **Error Boundaries**: React Error Boundaries wrap parent layout components. If a component crashes, the boundary catches the error and displays a fallback UI, preventing the entire application from crashing.
*   **User Notifications**: Network errors and validation issues are caught by services and displayed to the user using UI alert cards.

---

## 8. Git Branching Strategy

The repository follows a clean branch management workflow based on **GitHub Flow**:

*   **`main` Branch**: The production-ready code branch. Direct commits to `main` are blocked.
*   **`feature/*` Branches**: Development occurs on scoped feature branches (e.g., `feature/auth-setup`, `feature/kanban-board`).
*   **Pull Requests (PRs)**: Merging into `main` requires opening a PR. Merges are blocked until:
    *   The code builds successfully.
    *   Static analysis checks (linting) pass.
*   **Commits**: Commits follow clear naming conventions (e.g., `feat: add project selector page`, `fix: resolve task drag position`).

---

## 9. Coding Guidelines & Naming Conventions

### 9.1 TypeScript & React (Frontend)
*   **Naming Conventions**:
    *   *React Components*: PascalCase (e.g., `KanbanBoard.tsx`).
    *   *Functions & Variables*: camelCase (e.g., `activeProjectId`).
    *   *Types & Interfaces*: PascalCase (e.g., `TaskMetadata`).
*   **Coding Rules**:
    *   Every variable must have a defined type; use of `any` is prohibited.
    *   Components must be structured as functional components using explicit hook abstractions.
    *   State files and API queries must be isolated from view components.

### 9.2 Python (Backend)
*   **Naming Conventions**:
    *   *Class Definitions*: PascalCase (e.g., `SettingsManager`).
    *   *Functions & Variables*: snake_case (e.g., `get_active_sprint`).
    *   *Files & Folders*: snake_case (e.g., `security.py`).
*   **Coding Rules**:
    *   Enforce type hints on all function parameters and return values (e.g., `def create_task(payload: TaskSchema) -> TaskModel:`).
    *   Format code using standard styling rules (PEP 8).
    *   Business logic must reside in `services/`, keeping the controller endpoints in `routers/` thin and focused on routing.

---

## 10. Dependency Explanations

This section explains why each package is included in the project configuration.

### 10.1 Frontend Dependencies (`package.json`)
*   **`react` & `react-dom`**: Core library engine for rendering user interface components.
*   **`react-router-dom`**: Standard client-side routing library, enabling navigation between the login, dashboard, and settings screens.
*   **`zustand`**: A simple, fast state management library used to manage global store scopes (such as user sessions and active project settings).
*   **`@supabase/supabase-js`**: Supabase client library, used to query database tables and manage user logins.
*   **`axios`**: Promise-based HTTP client used to perform API calls to the FastAPI backend.
*   **`lucide-react`**: An open-source icon library used to render UI dashboard elements.
*   **`recharts`**: A composable charting library built on React components, used to display velocity and burndown charts.
*   **`@hello-pangea/dnd`**: An accessible drag-and-drop library, used to manage task cards on the Kanban board.
*   **`typescript`**: TypeScript compiler, providing static type validation.
*   **`vite` & `@vitejs/plugin-react`**: Frontend bundler and build tool, providing fast HMR (Hot Module Replacement) during development.
*   **`tailwindcss` & `autoprefixer`**: Utility-first CSS framework used to style the UI elements.

### 10.2 Backend Dependencies (`requirements.txt`)
*   **`fastapi`**: ASGI web framework used to expose endpoint routes and process HTTP requests.
*   **`uvicorn`**: A lightning-fast ASGI server implementation, used to run the FastAPI application.
*   **`pydantic` & `pydantic-settings`**: Data validation libraries, used to define schemas and load environment configurations securely.
*   **`supabase`**: Supabase Python client SDK, used to authenticate users and query PostgreSQL tables.
*   **`google-generativeai`**: Google Generative AI SDK, providing native access to Gemini LLM features.
*   **`apscheduler`**: In-app event scheduling library, used to run background checks and database tasks.
*   **`python-dotenv`**: Loads environment variables from `.env` files during local development.
*   **`httpx`**: Asynchronous HTTP client, used to perform outbound requests (such as webhook integrations).
*   **`python-multipart`**: Form parser, required by FastAPI to handle multi-part form payloads.
