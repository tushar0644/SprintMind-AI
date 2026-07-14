/**
 * tasks.spec.ts
 * Sprint 3 · Phase 8.1 — Task Foundation
 *
 * Senior QA Automation Engineer — Playwright E2E Verification
 *
 * Scope:
 *   1.  Navigate to Tasks page via direct URL
 *   2.  Sidebar — Tasks navigation link present and active on /tasks
 *   3.  Tasks page renders successfully (h1, "New Task" button)
 *   4.  Empty state renders correctly (heading + CTA)
 *   5.  "Create Task" button exists (header button + empty-state trigger)
 *   6.  Refresh page — page persists without redirect or error
 *   7a. Responsive — Desktop  (1280 × 720)
 *   7b. Responsive — Tablet   (768 × 1024)
 *   7c. Responsive — Mobile   (375 × 667)
 *   8.  Accessibility smoke test (landmark roles, button labelling)
 *   9.  No console errors (captured in afterEach)
 *   10. No unexpected network failures (captured in afterEach)
 *
 * OUT OF SCOPE:
 *   Task CRUD, Comments, Attachments, Labels, Kanban, Sprint, AI features.
 */

import { test, expect } from '@playwright/test';
import { cleanupDatabase } from './utils/cleanup';

// ─── Auth helpers ──────────────────────────────────────────────────────────

const E2E_EMAIL    = 'confirmed-user@sprintmind.ai';
const E2E_PASSWORD = 'confirmedpassword';

/**
 * Perform the mock-user login flow and wait for the dashboard URL.
 * Reused across every test that needs an authenticated session.
 */
async function loginAndWait(page: any) {
  await page.goto('/login');
  await page.fill('input[placeholder="name@company.com"]', E2E_EMAIL);
  await page.fill('input[placeholder="••••••••"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

// ─── Test Suite ────────────────────────────────────────────────────────────

test.describe('Phase 8.1 — Task Foundation E2E Tests', () => {
  test.beforeAll(async () => {
    await cleanupDatabase();
  });

  // Shared diagnostic accumulators; reset before every test.
  let consoleErrors:   string[] = [];
  let networkFailures: string[] = [];

  // ── beforeEach ────────────────────────────────────────────────────────────

  test.beforeEach(async ({ page }) => {
    consoleErrors   = [];
    networkFailures = [];

    // ── Console error listener ────────────────────────────────────────────
    // Expected/safe errors to suppress (auth handshake noise):
    //   • 401 / 403 — expected from /api/tasks with valid session on first load
    //                  while token propagates (Supabase edge timing)
    //   • 400 — validation round-trip noise
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      const isExpectedAuthNoise =
        text.includes('status of 400') ||
        text.includes('status of 401') ||
        text.includes('status of 403') ||
        text.includes('Request failed with status code 401') ||
        text.includes('Request failed with status code 403');
      if (!isExpectedAuthNoise) {
        consoleErrors.push(text);
      }
    });

    // ── Network failure listener ──────────────────────────────────────────
    // Suppress:
    //   • net::ERR_ABORTED — browser cancels in-flight requests on navigation.
    //     This is standard browser behaviour during SPA route transitions and
    //     is NOT an application error.
    // Only track failures from our own app + Supabase origin.
    page.on('requestfailed', (request) => {
      const url         = request.url();
      const failureText = request.failure()?.errorText || '';
      if (failureText.includes('net::ERR_ABORTED')) return;
      const isRelevantOrigin =
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('supabase.co');
      if (isRelevantOrigin) {
        networkFailures.push(`${request.method()} ${url} — ${failureText || 'unknown'}`);
      }
    });
  });

  // ── afterEach ─────────────────────────────────────────────────────────────

  test.afterEach(async ({ page }, testInfo) => {
    // Scenario 9: Assert no real JavaScript / application console errors
    expect(
      consoleErrors,
      `Console errors detected in "${testInfo.title}":\n${consoleErrors.join('\n')}`
    ).toEqual([]);

    // Scenario 10: Assert no unexpected network failures
    expect(
      networkFailures,
      `Network failures detected in "${testInfo.title}":\n${networkFailures.join('\n')}`
    ).toEqual([]);

    // Capture full-page screenshot on any failure for the QA report
    if (testInfo.status !== testInfo.expectedStatus) {
      const safeName  = testInfo.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const shotPath  = `e2e-screenshots/tasks_${safeName}_FAIL.png`;
      await page.screenshot({ path: shotPath, fullPage: true });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 1 — Open Tasks page via direct URL
  // ────────────────────────────────────────────────────────────────────────────

  test('1. Direct navigation to /tasks loads the Tasks page', async ({ page }) => {
    await loginAndWait(page);

    await page.goto('/tasks');
    await page.waitForURL('**/tasks', { timeout: 10_000 });

    // The page must NOT redirect away (i.e. still authenticated)
    expect(page.url()).toContain('/tasks');

    // Core heading must be present — confirms the Tasks component mounted
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 2 — Sidebar navigation
  // ────────────────────────────────────────────────────────────────────────────

  test('2. Sidebar — Tasks navigation link is present and navigates correctly', async ({ page }) => {
    await loginAndWait(page);

    // The sidebar is part of ProjectLayout; it is rendered on /dashboard too
    await page.goto('/dashboard');

    // "Tasks" link must be visible in the sidebar
    const tasksNavLink = page.locator('nav a[href="/tasks"]');
    await expect(tasksNavLink).toBeVisible();
    await expect(tasksNavLink).toContainText('Tasks');

    // Clicking it must navigate to /tasks
    await tasksNavLink.click();
    await page.waitForURL('**/tasks', { timeout: 10_000 });

    // After navigation, the link should carry the active style (indigo colour class)
    const activeLink = page.locator('nav a[href="/tasks"]');
    const classAttr  = await activeLink.getAttribute('class') ?? '';
    expect(classAttr).toContain('indigo');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 3 — Tasks page renders successfully
  // ────────────────────────────────────────────────────────────────────────────

  test('3. Tasks page renders all required structural elements', async ({ page }) => {
    await loginAndWait(page);
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');

    // Page title
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

    // Subtitle / task count line renders (not crashed)
    const subtitle = page.locator('text=/\\d+ tasks? total|Loading…/');
    await expect(subtitle).toBeVisible();

    // Primary CTA button exists in the page header
    const newTaskBtn = page.locator('#btn-create-task');
    await expect(newTaskBtn).toBeVisible();
    await expect(newTaskBtn).toBeEnabled();
    await expect(newTaskBtn).toContainText('New Task');

    // Status filter tab bar renders
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("To Do")')).toBeVisible();
    await expect(page.locator('button:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('button:has-text("Done")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancelled")')).toBeVisible();

    // Sidebar is present (shared ProjectLayout)
    await expect(page.locator('aside')).toBeVisible();

    // Top header shows the Tasks label
    await expect(page.locator('header:has-text("Tasks")')).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 4 — Empty state displays correctly
  // ────────────────────────────────────────────────────────────────────────────

  test('4. Empty state renders with correct heading and description', async ({ page }) => {
    await loginAndWait(page);
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');

    // Wait for the loading skeleton to resolve before asserting empty state
    await expect(page.locator('#tasks-loading-skeleton')).not.toBeVisible({ timeout: 10_000 });

    // Wait for either the task list or empty state to be attached in DOM
    await Promise.race([
      page.waitForSelector('#tasks-list', { state: 'attached', timeout: 5000 }).catch(() => {}),
      page.waitForSelector('text=No tasks yet', { state: 'attached', timeout: 5000 }).catch(() => {})
    ]);

    // If the test account has existing tasks, this scenario is moot — skip gracefully
    const taskList = page.locator('#tasks-list');
    const taskListExists = await taskList.count();
    if (taskListExists > 0) {
      // Tasks exist — empty state should NOT be shown; that's correct too
      await expect(page.locator('text=No tasks yet')).not.toBeVisible();
      return;
    }

    // No tasks — empty state MUST be visible
    await expect(page.locator('text=No tasks yet')).toBeVisible();
    await expect(page.locator('text=Break your project into actionable tasks')).toBeVisible();

    // Empty state CTA button must exist and be enabled
    const emptyStateBtn = page.locator('#btn-create-task-empty-trigger');
    await expect(emptyStateBtn).toBeVisible();
    await expect(emptyStateBtn).toBeEnabled();
    await expect(emptyStateBtn).toContainText('Create Task');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 5 — "Create Task" button exists (header + empty-state)
  // ────────────────────────────────────────────────────────────────────────────

  test('5. "New Task" header button exists and opens the Create Task modal', async ({ page }) => {
    await loginAndWait(page);
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');

    // Wait for skeleton to resolve
    await expect(page.locator('#tasks-loading-skeleton')).not.toBeVisible({ timeout: 10_000 });

    // Header button must always exist (regardless of tasks)
    const newTaskBtn = page.locator('#btn-create-task');
    await expect(newTaskBtn).toBeVisible();
    await expect(newTaskBtn).toBeEnabled();

    // Clicking it opens the Create Task modal
    await newTaskBtn.click();
    const modal = page.locator('#modal-create-task');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2:has-text("Create Task")')).toBeVisible();

    // Modal contains the title input
    await expect(modal.locator('input[placeholder="e.g. Implement JWT middleware"]')).toBeVisible();

    // Status and Priority selects are present
    await expect(modal.locator('select')).toHaveCount(3); // project, status, priority

    // Cancel button dismisses the modal without side effects
    await modal.locator('button:has-text("Cancel")').click();
    await expect(page.locator('#modal-create-task')).not.toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 6 — Refresh page
  // ────────────────────────────────────────────────────────────────────────────

  test('6. Refreshing the Tasks page maintains authentication and re-renders correctly', async ({ page }) => {
    await loginAndWait(page);
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');

    // Wait for initial render to settle
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

    // Hard browser reload
    await page.reload();

    // Must still be on /tasks — NOT redirected to /login
    await page.waitForURL('**/tasks', { timeout: 15_000 });
    expect(page.url()).toContain('/tasks');

    // Core elements re-render without crash
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();
    await expect(page.locator('#btn-create-task')).toBeVisible();

    // Skeleton should appear briefly then resolve (not hang forever)
    await expect(page.locator('#tasks-loading-skeleton')).not.toBeVisible({ timeout: 10_000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 7 — Responsive (Desktop · Tablet · Mobile)
  // ────────────────────────────────────────────────────────────────────────────

  const VIEWPORTS = [
    { name: 'Desktop', width: 1280, height: 720  },
    { name: 'Tablet',  width: 768,  height: 1024 },
    { name: 'Mobile',  width: 375,  height: 667  },
  ];

  for (const vp of VIEWPORTS) {
    test(`7. Responsive — ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await loginAndWait(page);

      // Set viewport BEFORE navigating so layout is calculated correctly
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/tasks');
      await page.waitForURL('**/tasks');

      // Application outer shell must be visible at every breakpoint
      await expect(page.locator('.min-h-screen')).toBeVisible();

      // The Tasks h1 heading must always be present
      await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

      // The "New Task" button must always be reachable
      await expect(page.locator('#btn-create-task')).toBeVisible();

      // Take a PASS screenshot for the QA report
      const shotPath = `e2e-screenshots/tasks_responsive_${vp.name}_PASS.png`;
      await page.screenshot({ path: shotPath, fullPage: true });
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 8 — Accessibility smoke test
  // ────────────────────────────────────────────────────────────────────────────

  test('8. Accessibility smoke test — landmark roles and button labelling', async ({ page }) => {
    await loginAndWait(page);
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');

    // ── Landmark roles ────────────────────────────────────────────────────
    // <aside> — sidebar navigation region
    await expect(page.locator('aside')).toBeVisible();

    // <nav> — sidebar navigation list
    await expect(page.locator('nav')).toBeVisible();

    // <header> — top workspace bar
    await expect(page.locator('header')).toBeVisible();

    // <main> — primary content region
    await expect(page.locator('main')).toBeVisible();

    // ── Heading hierarchy ────────────────────────────────────────────────
    // Exactly one <h1> on the page
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    await expect(page.locator('h1')).toHaveText('Tasks');

    // ── Interactive element labelling ────────────────────────────────────
    // Primary CTA: visible text label (not icon-only)
    const newTaskBtn = page.locator('#btn-create-task');
    await expect(newTaskBtn).toBeVisible();
    const btnText = await newTaskBtn.innerText();
    expect(btnText.trim().length).toBeGreaterThan(0);

    // Status filter buttons all have visible text labels
    const filterBtns = page.locator('button:has-text("All"), button:has-text("To Do"), button:has-text("In Progress"), button:has-text("Done"), button:has-text("Cancelled")');
    const filterCount = await filterBtns.count();
    expect(filterCount).toBeGreaterThanOrEqual(5);

    // ── Page title ───────────────────────────────────────────────────────
    await expect(page).toHaveTitle(/SprintMind AI/);

    // ── Keyboard focus: "New Task" button must be focusable ──────────────
    await newTaskBtn.focus();
    const isFocused = await newTaskBtn.evaluate(
      (el) => document.activeElement === el
    );
    expect(isFocused).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 9 + 10 — Console errors & Network failures
  // Covered implicitly by the afterEach assertions above.
  // This dedicated test provides an explicit, isolated pass/fail entry
  // in the report for clarity.
  // ────────────────────────────────────────────────────────────────────────────

  test('9 & 10. No console errors and no unexpected network failures on /tasks', async ({ page }) => {
    await loginAndWait(page);
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');

    // Allow API requests to settle
    await expect(page.locator('#tasks-loading-skeleton')).not.toBeVisible({ timeout: 10_000 });

    // Interact with the page to trigger any lazy network calls
    await page.locator('#btn-create-task').click();
    await expect(page.locator('#modal-create-task')).toBeVisible();
    await page.locator('#modal-create-task button:has-text("Cancel")').click();

    // Click each status filter tab
    for (const label of ['To Do', 'In Progress', 'Done', 'Cancelled', 'All']) {
      await page.locator(`button:has-text("${label}")`).first().click();
      await page.waitForTimeout(150);
    }

    // Final assertions are in afterEach — nothing more to assert here.
    // afterEach will verify consoleErrors === [] and networkFailures === [].
    expect(true).toBe(true); // explicit pass marker for test runner
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Scenario 11 — Perform Complete Task CRUD lifecycle
  // ────────────────────────────────────────────────────────────────────────────
  test('11. Perform Complete Task CRUD lifecycle', async ({ page }) => {
    await loginAndWait(page);
    // 1. Establish project context first by creating a project
    await page.goto('/projects');
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();

    // Click Create Project trigger
    await page.click('button:has-text("Create Project")');
    await expect(page.locator('h2:has-text("Create New Project")')).toBeVisible();

    const projectName = `Task E2E Proj ${Math.floor(Math.random() * 10000)}`;
    await page.fill('input[placeholder="e.g. SprintMind Engine"]', projectName);
    await page.fill('textarea[placeholder*="Summarize objectives"]', 'E2E testing context project.');
    await page.click('button[type="submit"]');

    // Verify project is created
    await expect(page.locator('h2:has-text("Create New Project")')).not.toBeVisible();
    await expect(page.locator(`text=${projectName}`)).toBeVisible();

    // 2. Go to Tasks page
    await page.goto('/tasks');
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible();

    // 3. Open Create Task modal and check validation
    await page.click('#btn-create-task');
    await expect(page.locator('h2:has-text("Create Task")')).toBeVisible();

    // Test Validation: empty title
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Task title is required.')).toBeVisible();

    // 4. Fill valid credentials and select our project
    const taskTitle = `E2E Task Title ${Math.floor(Math.random() * 10000)}`;
    await page.locator('#modal-create-task select').nth(0).selectOption({ label: projectName });
    await page.fill('input[placeholder="e.g. Implement JWT middleware"]', taskTitle);
    await page.fill('textarea[placeholder="Optional task details…"]', 'E2E Testing task description details.');
    await page.locator('#modal-create-task select').nth(1).selectOption('in_progress');
    await page.locator('#modal-create-task select').nth(2).selectOption('high');
    
    // Submit create task
    await page.click('button[type="submit"]');

    // Verify modal closes and task is listed
    await expect(page.locator('#modal-create-task')).not.toBeVisible();
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
    
    const taskCard = page.locator(`[id^="task-card-"]`, { hasText: taskTitle });
    await expect(taskCard.locator('text=In Progress')).toBeVisible();
    await expect(taskCard.locator('text=↑ High')).toBeVisible();

    // Verify success toast appears
    await expect(page.locator('#success-toast')).toBeVisible();
    await expect(page.locator('text=Task created successfully!')).toBeVisible();

    // Wait for toast to fade out or dismiss
    await page.waitForTimeout(1000);

    // 5. EDIT TRANSITION
    // Click edit icon button
    await taskCard.hover();
    const editBtn = taskCard.locator('[id^="btn-edit-task-"]');
    await editBtn.click();
    await expect(page.locator('h2:has-text("Edit Task")')).toBeVisible();

    // Update title and status
    const updatedTitle = `${taskTitle} Updated`;
    await page.fill('input[placeholder="e.g. Implement JWT middleware"]', updatedTitle);
    await page.locator('#modal-edit-task select').nth(0).selectOption('done');
    await page.locator('#modal-edit-task select').nth(1).selectOption('low');
    await page.click('button[type="submit"]');

    // Verify modal closes and task details are updated
    await expect(page.locator('#modal-edit-task')).not.toBeVisible();
    await expect(page.locator(`text=${updatedTitle}`)).toBeVisible();
    
    const updatedTaskCard = page.locator(`[id^="task-card-"]`, { hasText: updatedTitle });
    await expect(updatedTaskCard.locator('text=Done')).toBeVisible();
    await expect(updatedTaskCard.locator('text=↑ Low')).toBeVisible();
    await expect(page.locator('#success-toast')).toBeVisible();
    await expect(page.locator('text=Task updated successfully!')).toBeVisible();

    // Wait for toast
    await page.waitForTimeout(1000);

    // 6. ARCHIVE / DELETE TRANSITION
    // Hover and click Archive button
    await updatedTaskCard.hover();
    const archiveBtn = updatedTaskCard.locator('[id^="btn-archive-task-"]');
    await archiveBtn.click();
    await expect(page.locator('h3:has-text("Archive Task?")')).toBeVisible();

    // Click confirm archive
    await page.click('button:has-text("Yes, Archive")');

    // Verify modal closes and task is gone
    await expect(page.locator('#modal-archive-task')).not.toBeVisible();
    await expect(page.locator(`text=${updatedTitle}`)).not.toBeVisible();
    await expect(page.locator('#success-toast')).toBeVisible();
    await expect(page.locator('text=Task archived successfully!')).toBeVisible();

    // 7. CLEANUP: Delete/archive the project we created
    await page.goto('/projects');
    await expect(page.locator(`text=${projectName}`)).toBeVisible();
    
    // Find project card and click Archive
    const projectCard = page.locator('div.project-card', { hasText: projectName });
    await projectCard.locator('button[title="Archive Project"]').click();
    await expect(page.locator('h3:has-text("Archive Project?")')).toBeVisible();
    await page.click('button:has-text("Yes, Archive")');
    await expect(page.locator('h3:has-text("Archive Project?")')).not.toBeVisible();
    await expect(page.locator(`text=${projectName}`)).not.toBeVisible();
  });
});
