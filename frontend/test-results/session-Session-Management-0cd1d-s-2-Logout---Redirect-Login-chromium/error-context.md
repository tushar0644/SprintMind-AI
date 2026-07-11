# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session.spec.ts >> Session Management E2E Tests >> 2. Logout -> Redirect Login
- Location: e2e\session.spec.ts:60:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 11

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
+   "Error fetching database profile: AxiosError: Request failed with status code 401
+     at settle (http://localhost:5173/node_modules/.vite/deps/axios.js?v=844b5aed:1534:12)
+     at XMLHttpRequest.onloadend (http://localhost:5173/node_modules/.vite/deps/axios.js?v=844b5aed:1997:7)
+     at Axios.request (http://localhost:5173/node_modules/.vite/deps/axios.js?v=844b5aed:2930:41)
+     at async Object.fetchUserProfile (http://localhost:5173/src/store/authStore.ts?t=1783755013761:68:19)
+     at async initialize (http://localhost:5173/src/store/authStore.ts?t=1783755013761:55:9)
+     at async handleSignIn (http://localhost:5173/src/pages/Login.tsx?t=1783755805712:48:11)",
+   "Failed to load resource: the server responded with a status of 403 ()",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "SprintMind AI" [level=1] [ref=e6]
    - paragraph [ref=e7]: Sign in to coordinate your AI sprint assistant
  - generic [ref=e8]:
    - generic [ref=e9]:
      - text: Email Address
      - textbox "name@company.com" [ref=e10]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - text: Password
        - link "Forgot Password?" [ref=e13] [cursor=pointer]:
          - /url: /forgot-password
      - textbox "••••••••" [ref=e14]
    - button "Sign In" [ref=e15]
  - paragraph [ref=e17]:
    - text: Don't have an account?
    - link "Sign Up" [ref=e18] [cursor=pointer]:
      - /url: /signup
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Session Management E2E Tests', () => {
  4   |   let consoleErrors: string[] = [];
  5   |   let networkFailures: string[] = [];
  6   | 
  7   |   test.beforeEach(async ({ page }) => {
  8   |     consoleErrors = [];
  9   |     networkFailures = [];
  10  | 
  11  |     // Capture console errors
  12  |     page.on('console', (msg) => {
  13  |       if (msg.type() === 'error') {
  14  |         consoleErrors.push(msg.text());
  15  |       }
  16  |     });
  17  | 
  18  |     // Capture network request failures
  19  |     page.on('requestfailed', (request) => {
  20  |       const url = request.url();
  21  |       if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('supabase.co')) {
  22  |         networkFailures.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'unknown error'}`);
  23  |       }
  24  |     });
  25  |   });
  26  | 
  27  |   test.afterEach(async ({ page }, testInfo) => {
  28  |     // Assert no console errors (Scenario 6)
> 29  |     expect(consoleErrors).toEqual([]);
      |                           ^ Error: expect(received).toEqual(expected) // deep equality
  30  | 
  31  |     // Assert no unexpected network errors (Scenario 7)
  32  |     expect(networkFailures).toEqual([]);
  33  | 
  34  |     // Capture screenshots on failure
  35  |     if (testInfo.status !== testInfo.expectedStatus) {
  36  |       const screenshotPath = `e2e-screenshots/${testInfo.title.replace(/\s+/g, '_')}-failed.png`;
  37  |       await page.screenshot({ path: screenshotPath, fullPage: true });
  38  |     }
  39  |   });
  40  | 
  41  |   // Scenario 1: Login -> Refresh -> Still logged in
  42  |   test('1. Login -> Refresh -> Still logged in', async ({ page }) => {
  43  |     await page.goto('/login');
  44  |     await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
  45  |     await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
  46  |     await page.click('button[type="submit"]');
  47  | 
  48  |     await page.waitForURL('**/dashboard');
  49  |     await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  50  | 
  51  |     // Reload the page
  52  |     await page.reload();
  53  |     await page.waitForURL('**/dashboard');
  54  |     
  55  |     // Verify user is still logged in
  56  |     await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  57  |   });
  58  | 
  59  |   // Scenario 2: Logout -> Redirect Login
  60  |   test('2. Logout -> Redirect Login', async ({ page }) => {
  61  |     await page.goto('/login');
  62  |     await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
  63  |     await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
  64  |     await page.click('button[type="submit"]');
  65  | 
  66  |     await page.waitForURL('**/dashboard');
  67  |     
  68  |     // Click Sign Out
  69  |     await page.click('button:has-text("Sign Out")');
  70  |     await page.waitForURL('**/login');
  71  | 
  72  |     // Confirm redirected to login page
  73  |     await expect(page.locator('text=Sign in to coordinate your AI sprint assistant')).toBeVisible();
  74  |   });
  75  | 
  76  |   // Scenario 3: Open Dashboard Without Login -> Redirect Login
  77  |   test('3. Open Dashboard Without Login -> Redirect Login', async ({ page }) => {
  78  |     // Clear cookies and storage first
  79  |     await page.context().clearCookies();
  80  |     await page.goto('/dashboard');
  81  | 
  82  |     // Verify automatically redirected to login
  83  |     await page.waitForURL('**/login');
  84  |     await expect(page.locator('text=Sign in to coordinate your AI sprint assistant')).toBeVisible();
  85  |   });
  86  | 
  87  |   // Scenario 4: Login -> Open Login Page -> Redirect Dashboard
  88  |   test('4. Login -> Open Login Page -> Redirect Dashboard', async ({ page }) => {
  89  |     await page.goto('/login');
  90  |     await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
  91  |     await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
  92  |     await page.click('button[type="submit"]');
  93  | 
  94  |     await page.waitForURL('**/dashboard');
  95  | 
  96  |     // Manually navigate back to login
  97  |     await page.goto('/login');
  98  |     
  99  |     // Should automatically redirect back to dashboard
  100 |     await page.waitForURL('**/dashboard');
  101 |     await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  102 |   });
  103 | 
  104 |   // Scenario 5: Browser Refresh -> No UI Flicker (dashboard loading screen behaves cleanly)
  105 |   test('5. Browser Refresh -> No UI Flicker', async ({ page }) => {
  106 |     await page.goto('/login');
  107 |     await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
  108 |     await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
  109 |     await page.click('button[type="submit"]');
  110 | 
  111 |     await page.waitForURL('**/dashboard');
  112 | 
  113 |     // Reload the page and immediately verify that the loading page is displayed and login elements are NEVER shown
  114 |     await page.reload();
  115 |     
  116 |     const loadingScreen = page.locator('text=Initializing security state...');
  117 |     await expect(loadingScreen).toBeVisible();
  118 |     
  119 |     // Ensure it transitions directly to the dashboard
  120 |     await page.waitForURL('**/dashboard');
  121 |     await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  122 |   });
  123 | 
  124 |   // Scenario 8: Responsive Layout (Desktop, Tablet, Mobile)
  125 |   test('8. Responsive viewports on Dashboard', async ({ page }) => {
  126 |     // Login
  127 |     await page.goto('/login');
  128 |     await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
  129 |     await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
```