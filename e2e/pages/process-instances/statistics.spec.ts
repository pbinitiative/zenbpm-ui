import { test, expect, type ConsoleMessage } from '@playwright/test';

// Dedicated instance for statistics overlay testing.
// Instance 3100000000000000250 has:
//   - activeElementInstances: [{ elementId: 'task-a' }]  → activeCount: 1 on task-a
//   - one unresolved incident on task-a                  → incidentCount: 1 on task-a
// This gives both badge types (.running-badge and .failed-badge) on the same element.
const STATS_INSTANCE_KEY = '3100000000000000250';

test.describe('Process Instance Detail - Statistics Overlays', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${STATS_INSTANCE_KEY}`);
    // Wait for the page metadata panel and BPMN diagram to finish loading
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });
  });

  test('should display active count badge on element with active instances', async ({ page }) => {
    // The running-badge (green) is added by useBpmnMarkers as a bpmn-js overlay
    // when elementStatistics contains activeCount > 0 for an element.
    const runningBadge = page.locator('.running-badge');
    await expect(runningBadge.first()).toBeVisible({ timeout: 10000 });

    // The badge should show the count — task-a has exactly 1 active instance
    await expect(runningBadge.first()).toHaveText('1');
  });

  test('should display incident count badge on element with unresolved incidents', async ({ page }) => {
    // The failed-badge (red) is added by useBpmnMarkers as a bpmn-js overlay
    // when elementStatistics contains incidentCount > 0 for an element.
    const failedBadge = page.locator('.failed-badge');
    await expect(failedBadge.first()).toBeVisible({ timeout: 10000 });

    // The badge should show the count — task-a has exactly 1 unresolved incident
    await expect(failedBadge.first()).toHaveText('1');
  });

  test('should display both badges together when element has active instances and incidents', async ({ page }) => {
    // Both badges should co-exist for task-a on this instance
    await expect(page.locator('.running-badge').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.failed-badge').first()).toBeVisible({ timeout: 10000 });
  });

  test('statistics overlays should not emit MSW validation errors', async ({ page }) => {
    const validationErrors: string[] = [];
    const handler = (msg: ConsoleMessage) => {
      if (msg.text().includes('[MSW Validator]') && msg.text().includes('Invalid')) {
        validationErrors.push(msg.text());
      }
    };
    page.on('console', handler);

    await page.goto(`/process-instances/${STATS_INSTANCE_KEY}`);
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });
    // Wait for statistics request to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    page.off('console', handler);
    expect(validationErrors, `MSW schema violations: ${validationErrors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Process Instance Statistics - API endpoint', () => {
  test('statistics endpoint returns partitioned data for active instance', async ({ page }) => {
    let statisticsResponseBody: unknown = null;

    // Intercept the statistics API call
    page.on('response', async (response) => {
      if (response.url().includes(`/process-instances/${STATS_INSTANCE_KEY}/statistics`)) {
        statisticsResponseBody = await response.json().catch(() => null);
      }
    });

    await page.goto(`/process-instances/${STATS_INSTANCE_KEY}`);
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // The response should have the partitions structure
    expect(statisticsResponseBody).not.toBeNull();
    const body = statisticsResponseBody as { partitions: Array<{ partition: number; items: Record<string, { activeCount: number; incidentCount: number }> }> };
    expect(body).toHaveProperty('partitions');
    expect(Array.isArray(body.partitions)).toBe(true);

    // Find the partition that contains task-a stats
    const allItems = body.partitions.flatMap((p) => Object.entries(p.items));
    const taskAStats = allItems.find(([elementId]) => elementId === 'task-a');
    expect(taskAStats).toBeDefined();
    const [, counts] = taskAStats!;
    expect(counts.activeCount).toBe(1);
    expect(counts.incidentCount).toBe(1);
  });

  test('statistics endpoint returns 404 for non-existent instance', async ({ page }) => {
    const capturedStatus: { code: number | null } = { code: null };

    page.on('response', (response) => {
      if (response.url().includes('/process-instances/9999999999999999998/statistics')) {
        capturedStatus.code = response.status();
      }
    });

    // Navigate to a non-existent instance — the UI will show an error, but the
    // statistics endpoint will also be attempted (or the fetch will be skipped).
    // Either way, if the request fires it must return 404.
    await page.goto('/process-instances/9999999999999999998');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Either the request was never made (instance not found so hook is disabled)
    // or it returned 404 — both are correct behaviour.
    if (capturedStatus.code !== null) {
      expect(capturedStatus.code).toBe(404);
    }
  });
});
