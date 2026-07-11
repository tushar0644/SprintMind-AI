import { test, expect } from '@playwright/test';

test.describe('Projects Page E2E Tests', () => {
  let consoleErrors: string[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkFailures = [];

    // Capture console errors
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        // Exclude standard 401/403 session errors
        if (
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
      if (failureText.includes('net::ERR_ABORTED')) {
        return;
      }
      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('supabase.co')) {
        networkFailures.push(`${request.method()} ${url}: ${failureText || 'unknown error'}`);
      }
    });

    // Sign in bypass using mock E2E credentials
    await page.goto('/login');
    await page.fill('input[placeholder="name@company.com"]', 'confirmed-user@sprintmind.ai');
    await page.fill('input[placeholder="••••••••"]', 'confirmedpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test.afterEach(async () => {
    expect(consoleErrors).toEqual([]);
    expect(networkFailures).toEqual([]);
  });

  // Scenario 1: E2E CRUD Flow
  test('1. Perform Complete Project CRUD lifecycle', async ({ page }) => {
    // Navigate to Projects page
    await page.goto('/projects');
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();

    // Verify initially empty state
    await expect(page.locator('text=No projects found')).toBeVisible();

    // --- CREATE TRANSITION ---
    // Click Create Project button trigger
    await page.click('button:has-text("Create Project")');
    await expect(page.locator('h2:has-text("Create New Project")')).toBeVisible();

    // Test Validation: name too short
    await page.fill('input[placeholder="e.g. SprintMind Engine"]', 'Ab');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Project name must be between 3 and 100 characters')).toBeVisible();

    // Fill valid credentials
    const projectName = `E2E Workspace Space ${Math.floor(Math.random() * 10000)}`;
    await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
    await page.fill('textarea[placeholder*="Summarize objectives"]', 'E2E Testing workspace integration.');
    await page.click('button[type="submit"]');

    // Verify modal closes and project is listed
    await expect(page.locator('h2:has-text("Create New Project")')).not.toBeVisible();
    await expect(page.locator(`text=${projectName}`)).toBeVisible();
    await expect(page.locator('text=active')).toBeVisible();

    // Verify success toast appears
    await expect(page.locator('#success-toast')).toBeVisible();
    await expect(page.locator('text=Project created successfully')).toBeVisible();

    // --- EDIT TRANSITION ---
    // Click edit icon button
    await page.click('button[title="Edit Project"]');
    await expect(page.locator('h2:has-text("Edit Project Settings")')).toBeVisible();

    // Update name and select archived
    const updatedName = `${projectName} Edited`;
    await page.fill('input[placeholder="e.g. SprintMind Engine"]', updatedName);
    await page.selectOption('select', 'archived');
    await page.click('button[type="submit"]');

    // Verify modal closes and status is updated
    await expect(page.locator('h2:has-text("Edit Project Settings")')).not.toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    await expect(page.locator('text=archived')).toBeVisible();
    await expect(page.locator('text=Project updated successfully')).toBeVisible();

    // --- ARCHIVE / DELETE TRANSITION ---
    // Click Archive icon button
    await page.click('button[title="Archive Project"]');
    await expect(page.locator('h3:has-text("Archive Project?")')).toBeVisible();

    // Click confirm archive
    await page.click('button:has-text("Yes, Archive")');

    // Verify dialog closes and list is empty again
    await expect(page.locator('h3:has-text("Archive Project?")')).not.toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
    await expect(page.locator('text=No projects found')).toBeVisible();
    await expect(page.locator('text=Project archived successfully')).toBeVisible();
  });
});
