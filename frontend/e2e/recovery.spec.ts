import { test, expect } from '@playwright/test';

test.describe('Recovery & Verification E2E Tests', () => {
  let consoleErrors: string[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkFailures = [];

    // Capture console errors
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

      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('supabase.co')) {
        networkFailures.push(`${request.method()} ${url}: ${failureText || 'unknown error'}`);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Assert no console errors
    expect(consoleErrors).toEqual([]);

    // Assert no unexpected network errors
    expect(networkFailures).toEqual([]);
  });

  // Scenario 1: Forgot Password page recovery request
  test('1. Request password recovery successfully', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[placeholder="alex@company.com"]', 'user-test@sprintmind.ai');
    await page.click('button[type="submit"]');

    // Verify success banner is shown
    const successAlert = page.locator('text=Recovery email sent successfully');
    await expect(successAlert).toBeVisible();
  });

  // Scenario 2: Reset Password page submits password successfully
  test('2. Submit password reset successfully', async ({ page }) => {
    await page.goto('/reset-password#access_token=mock-token');
    await page.fill('input[placeholder="••••••••"] >> nth=0', 'newpassword123');
    await page.fill('input[placeholder="••••••••"] >> nth=1', 'newpassword123');
    await page.click('button[type="submit"]');

    // Verify redirect or success banner
    const successAlert = page.locator('text=Password updated successfully');
    await expect(successAlert).toBeVisible();
  });

  // Scenario 3: Verify OTP page resend + verify code successfully
  test('3. Verify email OTP and resend code with countdown timer', async ({ page }) => {
    await page.goto('/verify');
    await page.fill('input[placeholder="alex@company.com"]', 'user-test@sprintmind.ai');
    await page.fill('input[placeholder="123456"]', '123456');

    // Test resend code trigger
    const resendBtn = page.locator('text=Resend Verification Code');
    await expect(resendBtn).toBeVisible();
    await resendBtn.click();

    // Verify success banner for resending
    await expect(page.locator('text=Verification code successfully resent')).toBeVisible();

    // Verify button shows countdown timer and is disabled
    const cooldownBtn = page.locator('text=Resend code in');
    await expect(cooldownBtn).toBeVisible();
    await expect(cooldownBtn).toBeDisabled();

    // Submit OTP verification
    await page.click('button[type="submit"]');

    // Verify redirects to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
