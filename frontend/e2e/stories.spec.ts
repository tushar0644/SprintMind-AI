import { test, expect } from '@playwright/test';
import { cleanupDatabase } from './utils/cleanup';
import path from 'path';
import fs from 'fs';

test.describe('Document Stories E2E Tests', () => {
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

  test('AI Epic and User Story generation and collapsible section verification', async ({ page }) => {
    // 1. Ensure we are on projects and select/create a project
    await page.goto('/projects');
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();

    const hasProjects = await page.locator('.project-card').count();
    let projectName = "E2E Workspace Space Stories";
    if (hasProjects === 0) {
      await page.click('button:has-text("Create Project")');
      await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
      await page.fill('textarea[placeholder*="Summarize objectives"]', 'Project for user story testing.');
      await page.click('button[type="submit"]');
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
    }

    // 2. Navigate to Documents page
    await page.goto('/documents');
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
    
    // Wait for initial documents load
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/documents/project/') && 
      response.status() === 200
    );

    // 3. Upload a text file
    const tempFilePath = path.join(process.cwd(), 'test_doc_stories.txt');
    fs.writeFileSync(
      tempFilePath, 
      'SprintMind AI User Stories E2E Test Content.\n\n' +
      'Functional requirement: Users shall be able to trigger epic generation from document viewer.\n' +
      'Non-functional: The generation shall complete in under 5 seconds.\n' +
      'Business rule: Only authenticated members can trigger story planning.\n' +
      'Assumption: The Gemini API endpoint is responsive.\n' +
      'Dependency: The service depends on Pydantic and Supabase database client.\n' +
      'Risk: Large document sizes.'
    );

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempFilePath);

    // Wait for card to appear
    const docHeading = page.getByRole('heading', { name: 'test_doc_stories.txt' });
    await expect(docHeading).toBeVisible();

    // 4. Hover card and trigger chunking (required for analysis and requirements)
    await page.locator('.group', { hasText: 'test_doc_stories.txt' }).first().hover();
    
    const chunkPromise = page.waitForResponse(response =>
      response.url().includes('/chunk') && response.status() === 200
    );
    await page.locator('button[title="Semantic Chunking"]').click();
    await chunkPromise;

    // 5. Open preview modal
    await docHeading.click();
    await expect(page.locator('h2:has-text("test_doc_stories.txt")')).toBeVisible();

    // 6. Navigate to AI User Stories tab
    await page.click('#tab-stories');
    await expect(page.locator('text=Generate Epics & Stories')).toBeVisible();

    // 7. Click Generate Epics & Stories and await API response
    const storiesPromise = page.waitForResponse(response =>
      response.url().includes('/stories') && response.status() === 200
    );
    await page.click('#btn-trigger-stories');
    await storiesPromise;

    // 8. Verify structured content collapsible sections exist
    const firstEpicHeader = page.locator('text=[Mock] Document Intelligence Integration');
    await expect(firstEpicHeader).toBeVisible();

    // 9. Verify collapsible behavior
    const epicButton = page.locator('button:has-text("[Mock] Document Intelligence Integration")');
    await expect(epicButton).toHaveAttribute('aria-expanded', 'true');

    // First story should be visible
    const storyTitle = page.locator('text=[Mock] Parse Multi-Format Documents');
    await expect(storyTitle).toBeVisible();

    // Collapse first Epic
    await epicButton.click();
    await expect(epicButton).toHaveAttribute('aria-expanded', 'false');

    // First story should now be hidden
    await expect(storyTitle).not.toBeVisible();

    // 10. Verify attributes in second epic (expand it first)
    const secondEpicButton = page.locator('button:has-text("[Mock] AI Agile Artifacts Generation")');
    await expect(secondEpicButton).toHaveAttribute('aria-expanded', 'false');
    await secondEpicButton.click();
    await expect(secondEpicButton).toHaveAttribute('aria-expanded', 'true');

    // Verify Story Points and Priority badge
    await expect(page.locator('text=High Priority').first()).toBeVisible();
    await expect(page.locator('text=3 SP').first()).toBeVisible();

    // Close preview modal
    await page.click('button[aria-label="Close preview"]');
    await expect(page.locator('h2:has-text("test_doc_stories.txt")')).not.toBeVisible();

    // 11. Delete document to clean up
    await page.locator('.group', { hasText: 'test_doc_stories.txt' }).first().hover();
    
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('button[title="Delete File"]');
    await expect(page.locator('text=test_doc_stories.txt')).not.toBeVisible();

    // Cleanup E2E temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch {}
  });
});
