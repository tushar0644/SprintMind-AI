# Playwright E2E Browser Testing

Playwright is used to verify the frontend UI components and the client-to-backend API flows.

---

## 1. Setup & Execution

### Prerequisites
*   Node.js installed.
*   FastAPI backend and React Vite frontend dev servers must be active.

### Running Tests
From the `frontend/` directory, run:
```bash
# Run all tests headlessly
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Show HTML test report
npx playwright show-report
```

---

## 2. Test Configuration (`playwright.config.ts`)
*   **Base URL**: `http://localhost:5173`
*   **Timeout**: 30 seconds per test.
*   **Workers**: 1 (to ensure sequentially correct database states).
*   **Screenshot on Failure**: Captured and saved in `test-results/` for easy debugging.

---

## 3. Coverage Scenarios

The test suite in [auth.spec.ts](file:///c:/Users/Tushar/OneDrive/Desktop/SprintMind%20AI/frontend/e2e/auth.spec.ts) verifies:
1.  **Form Validations**: Client-side warnings for invalid emails and weak passwords.
2.  **Duplicate Signup**: Checks that registering with an existing email displays a warning.
3.  **Authentication Success**: Direct login with confirmed credentials and redirect to dashboard.
4.  **Loading & States**: Spinner indicators visible during API calls.
5.  **Console & Network Checks**: The test suite logs and fails on unexpected console errors or network failures.
6.  **Responsive Layout**: Exercises viewport resizing for Desktop (1280x720), Tablet (768x1024), and Mobile (375x667).
7.  **Accessibility (a11y)**: Smoke test verifying accessibility constraints like placeholder labels and required elements.
