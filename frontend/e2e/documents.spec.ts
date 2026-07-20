import { test, expect } from '@playwright/test';
import { cleanupDatabase } from './utils/cleanup';
import path from 'path';
import fs from 'fs';

test.describe('Documents Page E2E Tests', () => {
  test.beforeAll(async () => {
    await cleanupDatabase();
  });

  let consoleErrors: string[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkFailures = [];

    // Capture console errors
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
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

  test('1. Document upload, filter, preview and delete lifecycle', async ({ page }) => {
    // 1. Ensure we have at least one project by visiting projects and creating one if none exists
    await page.goto('/projects');
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();

    // Check if any project card exists
    const hasProjects = await page.locator('.project-card').count();
    let projectName = "E2E Workspace Space Documents";
    if (hasProjects === 0) {
      await page.click('button:has-text("Create Project")');
      await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
      await page.fill('textarea[placeholder*="Summarize objectives"]', 'Project for document testing.');
      await page.click('button[type="submit"]');
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
    } else {
      const text = await page.locator('.project-card h3').first().textContent();
      projectName = text ? text.trim() : projectName;
    }

    // 2. Navigate to Documents page
    await page.goto('/documents');
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
    
    // Wait for initial documents list load request to complete
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/documents/project/') && 
      response.status() === 200
    );

    // 3. Perform file upload
    // Create a temporary file for test upload
    const tempFilePath = path.join(process.cwd(), 'test_doc_upload.txt');
    fs.writeFileSync(tempFilePath, 'SprintMind Documents E2E Upload Test File Content');

    // Get the file input and upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempFilePath);

    // Verify document shows up in the grid
    const docHeading = page.getByRole('heading', { name: 'test_doc_upload.txt' });
    await expect(docHeading).toBeVisible();

    // 4. Test Search
    await page.fill('input[placeholder="Search documents by filename..."]', 'test_doc');
    await expect(docHeading).toBeVisible();

    await page.fill('input[placeholder="Search documents by filename..."]', 'nonexistent_file_name_123');
    await expect(page.locator('text=No documents found')).toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Search documents by filename..."]', '');
    await expect(docHeading).toBeVisible();

    // 5. Preview document
    await docHeading.click();
    await expect(page.locator('h2:has-text("test_doc_upload.txt")')).toBeVisible();
    await expect(page.locator('text=SprintMind Documents E2E Upload Test File Content')).toBeVisible();

    // Close preview
    await page.click('button[aria-label="Close preview"]');
    await expect(page.locator('h2:has-text("test_doc_upload.txt")')).not.toBeVisible();

    // 6. Delete document
    // Trigger hover on document card to make delete visible
    await page.locator('.group', { hasText: 'test_doc_upload.txt' }).first().hover();
    
    // Setup dialog handler to accept delete prompt
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    await page.click('button[title="Delete File"]');

    // Verify deletion
    await expect(page.locator('text=test_doc_upload.txt')).not.toBeVisible();

    // Cleanup E2E temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch {}
  });
});
