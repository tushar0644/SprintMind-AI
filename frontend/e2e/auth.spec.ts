import { test, expect } from '@playwright/test';

// Generate a random email to prevent duplicate signups across test executions
const randomEmail = () => `user-${Math.floor(Math.random() * 1000000)}@sprintmind.ai`;

test.describe('Authentication Tests', () => {
  let consoleErrors: string[] = [];
  let unexpectedNetworkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    unexpectedNetworkFailures = [];

    // Capture browser console errors
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        // Exclude standard HTTP status warnings for expected test failures and logouts (400, 401, 403)
        if (
          !text.includes('status of 400') &&
          !text.includes('status of 401') &&
          !text.includes('status of 403') &&
          !text.includes('Request failed with status code 401') &&
          !text.includes('Request failed with status code 403')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // Capture network request failures
    page.on('requestfailed', (request) => {
      const url = request.url();
      const failureText = request.failure()?.errorText || '';
      
      // Ignore standard browser-aborted requests during page transition unloads
      if (failureText.includes('net::ERR_ABORTED')) {
        return;
      }

      // Only track local app or Supabase requests as critical failures
      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('supabase.co')) {
        unexpectedNetworkFailures.push(
          `${request.method()} ${url} failed: ${failureText || 'unknown error'}`
        );
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Scenario 12: Assert no console errors exist
    expect(consoleErrors).toEqual([]);

    // Scenario 13: Assert no unexpected network failures exist
    expect(unexpectedNetworkFailures).toEqual([]);
  });

  // Scenario 1: Application loads successfully
  test('1. Application loads successfully', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/SprintMind AI/);
  });

  // Scenario 2: Signup page loads
  test('2. Signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('text=Create your developer workspace account')).toBeVisible();
  });

  // Scenario 3: Login page loads
  test('3. Login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign in to coordinate your AI sprint assistant')).toBeVisible();
  });

  // Scenario 4: Successful Signup
  test('4. Successful Signup', async ({ page }) => {
    await page.goto('/signup');
    const email = randomEmail();

    await page.fill('input[placeholder="Alex Johnson"]', 'E2E Test User');
    await page.fill('input[placeholder="alex@company.com"]', email);
    await page.fill('input[placeholder="•••••••• (Min 6 characters)"]', 'testpassword123');
    await page.fill('input[placeholder="••••••••"]', 'testpassword123');

    await page.click('button[type="submit"]');

    // Verify success alert message is visible
    const successAlert = page.locator('text=Registration successful');
    await expect(successAlert).toBeVisible();
  });

  // Scenario 5: Duplicate Signup
  test('5. Duplicate Signup', async ({ page }) => {
    await page.goto('/signup');
    const email = randomEmail();

    // First signup
    await page.fill('input[placeholder="Alex Johnson"]', 'E2E Test User');
    await page.fill('input[placeholder="alex@company.com"]', email);
    await page.fill('input[placeholder="•••••••• (Min 6 characters)"]', 'testpassword123');
    await page.fill('input[placeholder="••••••••"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Registration successful')).toBeVisible();

    // Second signup with same email
    await page.goto('/signup');
    await page.fill('input[placeholder="Alex Johnson"]', 'E2E Test User');
    await page.fill('input[placeholder="alex@company.com"]', email);
    await page.fill('input[placeholder="•••••••• (Min 6 characters)"]', 'testpassword123');
    await page.fill('input[placeholder="••••••••"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Should display validation or error alert (User already registered)
    const errorAlert = page.locator('.bg-red-500\\/10');
    await expect(errorAlert).toBeVisible();
  });

  // Scenario 6: Successful Login
  test('6. Successful Login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  });

  // Scenario 7: Invalid Login
  test('7. Invalid Login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error message should be shown
    const errorAlert = page.locator('.bg-red-500\\/10');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/invalid/i);
  });

  // Scenario 8: Empty Form Validation
  test('8. Empty Form Validation', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Evaluate browser-level validity constraint
    const isEmailRequired = await emailInput.evaluate((el: HTMLInputElement) => el.required);
    const isPasswordRequired = await passwordInput.evaluate((el: HTMLInputElement) => el.required);
    expect(isEmailRequired).toBe(true);
    expect(isPasswordRequired).toBe(true);
  });

  // Scenario 9: Invalid Email Validation
  test('9. Invalid Email Validation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'notanemail');
    await page.fill('input[placeholder="••••••••"]', 'somepassword');
    await page.click('button[type="submit"]');

    // Should display validation alert
    const errorAlert = page.locator('.bg-red-500\\/10');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Please enter a valid email address.');
  });

  // Scenario 10: Weak Password Validation
  test('10. Weak Password Validation', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[placeholder="Alex Johnson"]', 'Weak User');
    await page.fill('input[placeholder="alex@company.com"]', randomEmail());
    await page.fill('input[placeholder="•••••••• (Min 6 characters)"]', '123');
    await page.fill('input[placeholder="••••••••"]', '123');
    await page.click('button[type="submit"]');

    // Password must be at least 6 characters check
    const errorAlert = page.locator('.bg-red-500\\/10');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Password must be at least 6 characters.');
  });

  // Scenario 11: Loading State
  test('11. Loading State', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    
    // Click submit and immediately expect spinner text
    await page.click('button[type="submit"]');
    const loadingText = page.locator('text=Signing In...');
    await expect(loadingText).toBeVisible();
  });

  // Scenario 14: Responsive Test
  test('14. Responsive Test', async ({ page }) => {
    const viewports = [
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      const formBox = page.locator('.max-w-md');
      await expect(formBox).toBeVisible();
    }
  });

  // Scenario 15: Accessibility Smoke Test
  test('15. Accessibility Smoke Test', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');

    const emailPlaceholder = await emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toBeTruthy();
    
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
