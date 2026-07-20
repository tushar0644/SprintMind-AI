import { test, expect } from '@playwright/test';
import { cleanupDatabase } from './utils/cleanup';

test.describe('Collaboration Foundation — Task Comments E2E Tests', () => {
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

    // Capture HTTP errors and log details
    page.on('response', async (response) => {
      const status = response.status();
      if (status >= 400) {
        console.error(`HTTP_ERROR_DIAGNOSTIC [${status}] ${response.request().method()} ${response.url()}`);
        try {
          const body = await response.json();
          console.error("HTTP_ERROR_BODY:", JSON.stringify(body));
        } catch {
          try {
            const text = await response.text();
            console.error("HTTP_ERROR_TEXT:", text.substring(0, 500));
          } catch {}
        }
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

  test('Perform complete Task Comments collaboration lifecycle', async ({ page }) => {
    // 1. Create a project
    await page.goto('/projects');
    await page.click('button:has-text("Create Project")');
    const projectName = `Comments Test Project ${Math.floor(Math.random() * 1000)}`;
    await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
    await page.fill('textarea[placeholder*="Summarize objectives"]', 'E2E Comments test project objectives.');
    await page.click('button[type="submit"]');
    await expect(page.locator(`text=${projectName}`)).toBeVisible();

    // 2. Go to Tasks page and create a task
    await page.goto('/tasks');
    await page.waitForSelector('#btn-create-task');
    await page.click('#btn-create-task');
    
    // Fill task creation form
    const taskName = `Comments Test Task ${Math.floor(Math.random() * 1000)}`;
    await page.fill('input[placeholder="e.g. Implement JWT middleware"]', taskName);
    await page.fill('textarea[placeholder="Optional task details…"]', 'Initial task details.');
    const projectSelect = page.locator('#modal-create-task select').first();
    await projectSelect.waitFor({ state: 'visible' });
    await page.waitForSelector(`#modal-create-task select option:has-text("${projectName}")`, { state: 'attached', timeout: 10_000 });
    await projectSelect.selectOption({ label: projectName });
    await page.click('button[type="submit"]');

    // Wait for the task card to appear in the list
    await expect(page.locator(`text=${taskName}`)).toBeVisible();

    const taskCard = page.locator('#tasks-list').locator('.bg-white', { hasText: taskName });
    await taskCard.hover();
    await taskCard.locator('button[title="Edit task"]').first().click();

    // Verify modal is loaded and show side-by-side layout
    const modal = page.locator('#modal-edit-task');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Discussion & Collaboration')).toBeVisible();

    // Wait for the comments loading skeletons to disappear
    await expect(modal.locator('.animate-pulse').first()).not.toBeVisible();

    // Verify initially no discussion state is shown
    await expect(modal.locator('text=No discussion yet')).toBeVisible();

    // 4. Post a top-level comment (Markdown check)
    const topEditor = modal.locator('textarea[placeholder*="Share your thoughts"]');
    await topEditor.fill('This is a comment with **strong** markdown.');
    const postPromise = page.waitForResponse(
      (res) => res.url().includes("/api/comments") && res.request().method() === "POST" && res.status() === 201
    );
    await modal.locator('button:has-text("Comment")').click();
    await postPromise;

    // Verify the comment is visible and parsed as markdown (HTML strong element is rendered)
    await expect(modal.locator('text=No discussion yet')).not.toBeVisible();
    await expect(modal.locator('strong:has-text("strong")')).toBeVisible();

    // 5. Toggle an emoji reaction
    const commentCard = modal.locator('.group.relative').first();
    await commentCard.hover();
    
    // Select the 👍 emoji button
    const thumbBtn = commentCard.locator('button[title="React 👍"]');
    const reactPromise = page.waitForResponse(
      (res) => res.url().includes("/reactions") && res.request().method() === "POST" && res.status() === 200
    );
    await thumbBtn.click();
    await reactPromise;

    // Verify reaction count bubble is rendered on the UI
    const reactionBubble = commentCard.locator('button:has-text("👍")');
    await expect(reactionBubble).toBeVisible();
    await expect(reactionBubble).toContainText('1');

    // 6. Post a threaded reply to the comment
    await commentCard.locator('button:has-text("Reply")').first().click();
    const replyEditor = commentCard.locator('textarea[placeholder*="Type your reply"]');
    await replyEditor.fill('This is a threaded E2E reply.');
    const replyPromise = page.waitForResponse(
      (res) => res.url().includes("/api/comments") && res.request().method() === "POST" && res.status() === 201
    );
    await commentCard.locator('form:has(textarea[placeholder*="Type your reply"]) button[type="submit"]').click();
    await replyPromise;

    // Verify reply renders nested under parent comment card
    await expect(commentCard.locator('div.break-words', { hasText: 'This is a threaded E2E reply.' }).first()).toBeVisible();

    // 7. Edit the parent comment
    // Open action menu
    await commentCard.locator('button[class*="text-stitch-on-surface-variant/50"]').first().click();
    await page.click('button:has-text("Edit")');
    
    // Fill edited text
    const editArea = commentCard.locator('textarea[placeholder*="Write a comment"]');
    await editArea.fill('Edited parent comment content.');
    const editPromise = page.waitForResponse(
      (res) => res.url().includes("/api/comments/") && res.request().method() === "PATCH" && res.status() === 200
    );
    await commentCard.locator('button:has-text("Save")').click();
    await editPromise;

    // Verify content is updated
    await expect(commentCard.locator('div.break-words', { hasText: 'Edited parent comment content.' }).first()).toBeVisible();

    // 8. Delete (soft-delete) the parent comment
    // Setup dialog listener to accept confirm
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete this comment?');
      await dialog.accept();
    });

    // Open action menu and delete
    const deletePromise = page.waitForResponse(
      (res) => res.url().includes("/api/comments/") && res.request().method() === "DELETE" && res.status() === 204
    );
    await commentCard.locator('button[class*="text-stitch-on-surface-variant/50"]').first().click();
    await page.click('button:has-text("Delete")');
    await deletePromise;

    // Verify soft delete mask replaces original text and author name
    await expect(commentCard.locator('div.break-words', { hasText: '[Comment deleted]' }).first()).toBeVisible();
    await expect(commentCard.locator('text=Deleted User')).toBeVisible();
  });
});
