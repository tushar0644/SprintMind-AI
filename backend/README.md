# SprintMind AI Backend
## Foundational Architecture & Developer Guide

This repository contains the backend codebase for the SprintMind AI Project Assistant. It is designed using **Clean Architecture** guidelines, ensuring decoupling between HTTP route handlers, business logic cores, and database transaction engines.

---

## 1. Directory Structure Specifications

```
backend/
├── app/                        # Application Source Code
│   ├── main.py                 # FastAPI Application Gateway Entrypoint
│   ├── routers/                # Transportation Layer (HTTP Endpoint Mappings)
│   ├── services/               # Core Business Logic & External Adapters
│   ├── schemas/                # Pydantic Typing Data Schemas (DTOs)
│   ├── models/                 # Database Entity Configurations
│   ├── core/                   # Core Infrastructure & Helpers
│   ├── config/                 # Environment Configuration Controllers
│   ├── utils/                  # Common System Helpers
│   ├── automation/             # Scheduler Engine (APScheduler Workers)
│   └── prompts/                # AI Prompt Templates Library
│
├── tests/                      # Automated Test Suite (pytest)
│
├── requirements.txt            # Dependency Manifest
├── .env.example                # Sample Environment Template
├── README.md                   # System Architecture Documentation
└── .gitignore                  # Git Ignoring Definitions
```

---

## 2. Component & Folder Documentation

### 2.1 `app/routers/`
*   **Purpose**: The transportation layer containing API endpoint definitions.
*   **Why it exists**: Isolates the HTTP presentation layer from business logic. Endpoints are thin wrappers that validate requests and delegate work to services.
*   **What goes inside**: Router modules (e.g., `auth.py`, `projects.py`, `tasks.py`, `sprints.py`).
*   **Future Phases**: Used in **Phases 5, 6, 7, 8, 9, 10, 11, and 13** to expose endpoints to the frontend.

### 2.2 `app/services/`
*   **Purpose**: Implements core business logic and integrates third-party systems.
*   **Why it exists**: Houses the application's core rules and coordinates tasks. Services are independent of the HTTP delivery mechanism.
*   **What goes inside**: Business logic modules (e.g., `db_service.py` for database operations, `gemini_service.py` for LLM operations).
*   **Future Phases**: Used in **Phases 6, 7, 8, 9, 10, 11, 12, and 13** to manage workflows and external integrations.

### 2.3 `app/schemas/`
*   **Purpose**: Defines Pydantic data schemas for request and response validation.
*   **Why it exists**: Serves as a data contract (DTOs) between the frontend client and backend API, enforcing type safety and payload validation.
*   **What goes inside**: Input/output schemas (e.g., `user_schema.py`, `task_schema.py`, `sprint_schema.py`).
*   **Future Phases**: Used throughout **all coding phases** to validate API request payloads and structure JSON responses.

### 2.4 `app/models/`
*   **Purpose**: Defines database models representing PostgreSQL tables.
*   **Why it exists**: Maps application data structures to database tables, defining schemas and relationships.
*   **What goes inside**: Database definitions (e.g., `project_model.py`, `task_model.py`, `sprint_model.py`).
*   **Future Phases**: Used in **Phases 3, 6, 7, and 8** to configure the database schema and relationships.

### 2.5 `app/core/`
*   **Purpose**: Houses system-wide services and utility layers.
*   **Why it exists**: Centralizes configuration, logging, database connections, and security logic used across multiple modules.
*   **What goes inside**: Infrastructure setup modules (e.g., `database.py` for DB connection initialization, `security.py` for JWT validation, `logging.py` for system logging).
*   **Future Phases**: Configured in **Phase 5** and used in all subsequent development and testing phases.

### 2.6 `app/config/`
*   **Purpose**: Manages system configurations and parses environment variables.
*   **Why it exists**: Loads and validates environment variables at startup, providing a single source of truth for configuration.
*   **What goes inside**: Settings classes (e.g., `settings.py` mapping `.env` files).
*   **Future Phases**: Configured in **Phase 5** and used throughout the application lifecycle to manage configuration.

### 2.7 `app/utils/`
*   **Purpose**: Contains shared helper functions used throughout the application.
*   **Why it exists**: Consolidates common tasks (like date formatting and string manipulation) to prevent code duplication.
*   **What goes inside**: Helper modules (e.g., `date_formatters.py`, `text_utils.py`).
*   **Future Phases**: Used in all development phases to simplify common helper tasks.

### 2.8 `app/automation/`
*   **Purpose**: Manages scheduled and automated background tasks.
*   **Why it exists**: Runs automated jobs (like daily updates and database cleanup) asynchronously, keeping them separate from the main API threads.
*   **What goes inside**: Scheduler configurations (e.g., `scheduler.py` configuring APScheduler, `jobs.py` defining tasks).
*   **Future Phases**: Configured in **Phase 12** to manage scheduled notifications and updates.

### 2.9 `app/prompts/`
*   **Purpose**: Houses prompt templates used by the AI engine.
*   **Why it exists**: Manages AI prompts as version-controlled code assets, separating prompt design from application logic.
*   **What goes inside**: Markdown prompt templates (e.g., `meeting_summary.md`, `task_generator.md`, `sprint_planner.md`).
*   **Future Phases**: Used in **Phases 9, 10, and 11** to manage prompts for Gemini API operations.

---

## 3. Root File Specifications

### 3.1 `requirements.txt`
*   **Purpose**: Lists the Python package dependencies.
*   **When used**: Used by package managers (`pip`) to set up the environment and during deployment on Render.
*   **Best practices**: Pin major and minor dependency versions (e.g., `fastapi>=0.111.0`) to ensure stability while allowing patch updates.

### 3.2 `.env.example`
*   **Purpose**: A template file documenting the required environment variables.
*   **When used**: Used when configuring new development or production environments.
*   **Best practices**: Document all required variables with placeholder values. Never commit actual API keys or database credentials to Git.

### 3.3 `.gitignore`
*   **Purpose**: Specifies files and directories that Git should ignore.
*   **When used**: Checked by Git during version control operations.
*   **Best practices**: Ignore local secret files (`.env`), Python caches (`__pycache__`), and virtual environments (`venv/`).

### 3.4 `README.md`
*   **Purpose**: The main documentation guide for the backend project.
*   **When used**: Used when onboarding developers and configuring environments.
*   **Best practices**: Keep setup instructions clear, document directory structures, and outline architectural patterns.

---

## 4. Development Setup Guide

### 1. Prerequisites
*   Python 3.12+
*   Pip (Python Package Installer)

### 2. Virtual Environment Configuration
Create and activate the virtual environment:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Dependency Installation
Install the project dependencies:
```bash
pip install -r requirements.txt
```

### 4. Running the Application
Start the FastAPI server locally:
```bash
# Set PYTHONPATH to the root directory
$env:PYTHONPATH="."  # PowerShell
export PYTHONPATH="." # Bash

# Start the server using Uvicorn
uvicorn app.main:app --port 8000 --reload
```
Once started, the interactive API documentation is available at `http://localhost:8000/docs`.
