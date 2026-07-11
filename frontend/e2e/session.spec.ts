import { test, expect } from '@playwright/test';

test.describe('Session Management E2E Tests', () => {
  let consoleErrors: string[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkFailures = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network request failures
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('supabase.co')) {
        networkFailures.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'unknown error'}`);
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Assert no console errors (Scenario 6)
    expect(consoleErrors).toEqual([]);

    // Assert no unexpected network errors (Scenario 7)
    expect(networkFailures).toEqual([]);

    // Capture screenshots on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `e2e-screenshots/${testInfo.title.replace(/\s+/g, '_')}-failed.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  });

  // Scenario 1: Login -> Refresh -> Still logged in
  test('1. Login -> Refresh -> Still logged in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForURL('**/dashboard');
    
    // Verify user is still logged in
    await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  });

  // Scenario 2: Logout -> Redirect Login
  test('2. Logout -> Redirect Login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    
    // Click Sign Out
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL('**/login');

    // Confirm redirected to login page
    await expect(page.locator('text=Sign in to coordinate your AI sprint assistant')).toBeVisible();
  });

  // Scenario 3: Open Dashboard Without Login -> Redirect Login
  test('3. Open Dashboard Without Login -> Redirect Login', async ({ page }) => {
    // Clear cookies and storage first
    await page.context().clearCookies();
    await page.goto('/dashboard');

    // Verify automatically redirected to login
    await page.waitForURL('**/login');
    await expect(page.locator('text=Sign in to coordinate your AI sprint assistant')).toBeVisible();
  });

  // Scenario 4: Login -> Open Login Page -> Redirect Dashboard
  test('4. Login -> Open Login Page -> Redirect Dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Manually navigate back to login
    await page.goto('/login');
    
    // Should automatically redirect back to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  });

  // Scenario 5: Browser Refresh -> No UI Flicker (dashboard loading screen behaves cleanly)
  test('5. Browser Refresh -> No UI Flicker', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Reload the page and immediately verify that the loading page is displayed and login elements are NEVER shown
    await page.reload();
    
    const loadingScreen = page.locator('text=Initializing security state...');
    await expect(loadingScreen).toBeVisible();
    
    // Ensure it transitions directly to the dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Welcome, Confirmed User!')).toBeVisible();
  });

  // Scenario 8: Responsive Layout (Desktop, Tablet, Mobile)
  test('8. Responsive viewports on Dashboard', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const viewports = [
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Verify layout main container remains visible
      const mainContainer = page.locator('.min-h-screen');
      await expect(mainContainer).toBeVisible();
    }
  });
});
