import { test, expect } from '@playwright/test';
import { cleanupDatabase } from './utils/cleanup';
import path from 'path';
import fs from 'fs';

test.describe('Document Project Generation E2E Tests', () => {
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
          !text.includes('status of 404') &&
          !text.includes('Request failed with status code 401') &&
          !text.includes('Request failed with status code 403') &&
          !text.includes('Request failed with status code 404')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // Capture non-2xx network responses with details
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        const url = response.url();
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          response.text().then(text => {
            console.error(`\n>>> E2E ERROR: ${response.request().method()} ${url} failed with status ${status}. Response: ${text}\n`);
          }).catch(() => {});
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

  test('Automatic Project Generation from AI Planning Artifacts', async ({ page }) => {
    // 1. Ensure we are on projects and create a unique project
    await page.goto('/projects');
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();

    const uniqueId = Date.now();
    const projectName = `E2E Workspace Space Project Gen ${uniqueId}`;
    
    await page.click('button:has-text("Create Project")');
    await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
    await page.fill('textarea[placeholder*="Summarize objectives"]', 'Project for automatic generation testing.');
    await page.click('button[type="submit"]');
    await expect(page.locator(`text=${projectName}`)).toBeVisible();

    // Click the newly created project card to activate it
    await page.click(`text=${projectName}`);

    // 2. Navigate to Documents page
    await page.goto('/documents');
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
    
    // Wait for initial documents load
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/documents/project/') && 
      response.status() === 200
    );

    // 3. Upload a text file
    const tempFilePath = path.join(process.cwd(), 'test_doc_generation.txt');
    fs.writeFileSync(
      tempFilePath, 
      'SprintMind AI Automatic Project Generation E2E Test Content.\n\n' +
      'Functional requirement: Users shall be able to trigger project generation from document viewer.\n' +
      'Non-functional: The generation shall complete in under 5 seconds.\n' +
      'Business rule: Only authenticated members can trigger generation.\n' +
      'Assumption: The Gemini API endpoint is responsive.\n' +
      'Dependency: The service depends on Pydantic and Supabase database client.\n' +
      'Risk: Large document sizes.'
    );

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempFilePath);

    // Wait for card to appear
    const docHeading = page.getByRole('heading', { name: 'test_doc_generation.txt' });
    await expect(docHeading).toBeVisible();

    // 4. Hover card and trigger chunking (required for analysis and stories)
    await page.locator('.group', { hasText: 'test_doc_generation.txt' }).first().hover();
    
    const chunkPromise = page.waitForResponse(response =>
      response.url().includes('/chunk') && response.status() === 200
    );
    await page.locator('button[title="Semantic Chunking"]').click();
    await chunkPromise;

    // 5. Open preview modal
    await docHeading.click();
    await expect(page.locator('h2:has-text("test_doc_generation.txt")')).toBeVisible();

    // 6. Click Generate Project in header and await API response
    const generationPromise = page.waitForResponse(response =>
      response.url().includes('/generate-project') && response.status() === 200
    );
    await page.click('#btn-generate-project');
    await generationPromise;

    // 7. Verify success overlay metrics are displayed
    await expect(page.locator('text=Project Generated Successfully!')).toBeVisible();
    await expect(page.locator('#summary-epics-count')).toHaveText('2');
    await expect(page.locator('#summary-tasks-count')).toHaveText('4');

    // 8. Wait for redirection to projects dashboard
    await page.waitForURL('**/projects/*', { timeout: 10000 });
    
    // Verify that we are on the projects detail page showing the generated project
    await expect(page.locator('h1')).toBeVisible();
    
    // Cleanup E2E temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch {}
  });
});
