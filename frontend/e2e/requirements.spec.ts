import { test, expect } from '@playwright/test';
import { cleanupDatabase } from './utils/cleanup';
import path from 'path';
import fs from 'fs';

test.describe('Document Requirements E2E Tests', () => {
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

  test('AI Requirements Extraction and collapsible section verification', async ({ page }) => {
    // 1. Ensure we are on projects and select/create a project
    await page.goto('/projects');
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();

    const hasProjects = await page.locator('.project-card').count();
    let projectName = "E2E Workspace Space Documents";
    if (hasProjects === 0) {
      await page.click('button:has-text("Create Project")');
      await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
      await page.fill('textarea[placeholder*="Summarize objectives"]', 'Project for document testing.');
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

    // 3. Upload a text file for analysis
    const tempFilePath = path.join(process.cwd(), 'test_doc_requirements.txt');
    fs.writeFileSync(
      tempFilePath, 
      'SprintMind AI Requirements Extraction E2E Test Content.\n\n' +
      'Functional requirement: Users shall be able to trigger requirements extraction from document viewer.\n' +
      'Non-functional: The extraction shall complete in under 5 seconds.\n' +
      'Business rule: Only authenticated members can trigger requirements.\n' +
      'Assumption: The Gemini API endpoint is up and running.\n' +
      'Dependency: The service depends on Pydantic and Supabase database client.\n' +
      'Risk: Large document sizes exceeding maximum token length context windows.'
    );

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempFilePath);

    // Wait for card to appear
    const docHeading = page.getByRole('heading', { name: 'test_doc_requirements.txt' });
    await expect(docHeading).toBeVisible();

    // 4. Hover card and trigger chunking (required for analysis and requirements)
    await page.locator('.group', { hasText: 'test_doc_requirements.txt' }).first().hover();
    
    const chunkPromise = page.waitForResponse(response =>
      response.url().includes('/chunk') && response.status() === 200
    );
    await page.locator('button[title="Semantic Chunking"]').click();
    await chunkPromise;

    // 5. Open preview modal
    await docHeading.click();
    await expect(page.locator('h2:has-text("test_doc_requirements.txt")')).toBeVisible();

    // 6. Navigate to AI Requirements tab
    await page.click('#tab-requirements');
    await expect(page.locator('text=Extract Requirements')).toBeVisible();

    // 7. Click Extract Requirements and await API response
    const requirementsPromise = page.waitForResponse(response =>
      response.url().includes('/requirements') && response.status() === 200
    );
    await page.click('#btn-trigger-requirements');
    await requirementsPromise;

    // 8. Verify structured content collapsible sections exist
    await expect(page.locator('#section-functional_requirements')).toBeVisible();
    await expect(page.locator('#section-non_functional_requirements')).toBeVisible();
    await expect(page.locator('#section-business_rules')).toBeVisible();
    await expect(page.locator('#section-assumptions')).toBeVisible();
    await expect(page.locator('#section-dependencies')).toBeVisible();
    await expect(page.locator('#section-risks')).toBeVisible();

    // 9. Verify collapsible section behavior
    // Section functional requirements starts expanded (aria-expanded should be true)
    const buttonFunc = page.locator('#section-functional_requirements button');
    await expect(buttonFunc).toHaveAttribute('aria-expanded', 'true');
    
    // Collapse Functional Requirements section
    await buttonFunc.click();
    await expect(buttonFunc).toHaveAttribute('aria-expanded', 'false');

    // Expand Business Rules section (starts collapsed)
    const buttonBusiness = page.locator('#section-business_rules button');
    await expect(buttonBusiness).toHaveAttribute('aria-expanded', 'false');
    await buttonBusiness.click();
    await expect(buttonBusiness).toHaveAttribute('aria-expanded', 'true');

    // Close preview modal
    await page.click('button[aria-label="Close preview"]');
    await expect(page.locator('h2:has-text("test_doc_requirements.txt")')).not.toBeVisible();

    // 10. Delete document to clean up
    await page.locator('.group', { hasText: 'test_doc_requirements.txt' }).first().hover();
    
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('button[title="Delete File"]');
    await expect(page.locator('text=test_doc_requirements.txt')).not.toBeVisible();

    // Cleanup E2E temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch {}
  });
});
