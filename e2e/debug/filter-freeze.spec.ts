import { test, expect } from '@playwright/test';

/**
 * Debug test for filter freeze issue.
 * Run against live backend with: npx playwright test e2e/debug/filter-freeze.spec.ts --headed
 *
 * Make sure the live frontend is running at http://localhost:3001
 */
test.describe('Filter Freeze Debug', () => {
  // Skip this test by default - it requires a live backend
  test.skip(({ browserName }) => browserName !== undefined, 'This test requires a live backend at localhost:3001. Run manually with: npx playwright test e2e/debug/filter-freeze.spec.ts --headed');

  // Use live backend URL
  test.use({ baseURL: 'http://localhost:3001' });

  test('should not freeze when opening and closing datepicker without selection', async ({ page }) => {
    // Enable performance tracing
    await page.goto('/processes?tab=instances');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Processes' })).toBeVisible({ timeout: 10000 });

    // Click on Instances tab
    const instancesTab = page.getByRole('tab', { name: /Instances/i });
    await instancesTab.click();

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Open filters panel
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }

    // Find the date picker input
    const dateInputs = page.locator('input[placeholder*="date" i], input[type="date"], .MuiDatePicker-root input, input[aria-label*="date" i]');

    // Try to find any date-related input
    const dateInput = page.locator('input').filter({ hasText: /from|to|date/i }).first();

    // Or look for the "Created At" filter section
    const createdAtSection = page.getByText('Created At').or(page.getByText('Created From'));

    console.log('Looking for date picker...');

    // Try multiple selectors for date picker
    const possibleDateInputs = [
      page.locator('input[placeholder*="From"]'),
      page.locator('input[placeholder*="To"]'),
      page.getByLabel(/from/i),
      page.getByLabel(/to/i),
      page.locator('[data-testid*="date"]'),
    ];

    let foundDateInput = null;
    for (const input of possibleDateInputs) {
      if (await input.first().isVisible().catch(() => false)) {
        foundDateInput = input.first();
        console.log('Found date input');
        break;
      }
    }

    if (!foundDateInput) {
      console.log('No date input found, skipping date picker test');
      return;
    }

    // Measure time for UI responsiveness
    const measureResponsiveness = async (label: string) => {
      const startTime = Date.now();

      // Try to click a simple element
      const simpleButton = page.getByRole('button').first();
      await simpleButton.click({ timeout: 5000, force: true }).catch(() => {});

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`${label}: UI response time = ${duration}ms`);
      return duration;
    };

    // Test 1: Click date input to open picker
    console.log('\n--- Test 1: Opening date picker ---');
    await foundDateInput.click();
    await page.waitForTimeout(500);

    // Test 2: Click elsewhere to close picker (this is where freeze happens)
    console.log('\n--- Test 2: Clicking elsewhere to close picker ---');
    const beforeClose = Date.now();

    // Click on the page body to close the picker
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    const afterClose = Date.now();
    console.log(`Time to close picker: ${afterClose - beforeClose}ms`);

    // Test 3: Immediately try to interact with UI
    console.log('\n--- Test 3: Testing UI responsiveness after closing ---');

    // Try clicking multiple elements rapidly
    const responseTime = await measureResponsiveness('After closing datepicker');

    // If response time > 1000ms, the UI was frozen
    expect(responseTime).toBeLessThan(1000);
  });

  test('should track network requests during filter interactions', async ({ page }) => {
    const networkRequests: { url: string; time: number }[] = [];

    // Listen to network requests
    page.on('request', (request) => {
      if (request.url().includes('/v1/')) {
        networkRequests.push({ url: request.url(), time: Date.now() });
        console.log(`[Network] Request: ${request.url()}`);
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('/v1/')) {
        console.log(`[Network] Response: ${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('/processes?tab=instances');

    // Wait for initial load
    await page.waitForTimeout(3000);

    console.log('\n--- Initial requests ---');
    console.log(`Total requests so far: ${networkRequests.length}`);

    // Click on state filter
    const stateFilter = page.getByLabel(/state/i).or(page.locator('select').first());
    if (await stateFilter.isVisible().catch(() => false)) {
      console.log('\n--- Clicking state filter ---');
      const beforeClick = networkRequests.length;
      await stateFilter.click();
      await page.waitForTimeout(1000);
      console.log(`New requests after click: ${networkRequests.length - beforeClick}`);
    }

    // Wait and check for background refresh requests
    console.log('\n--- Waiting for background requests (5 seconds) ---');
    const beforeWait = networkRequests.length;
    await page.waitForTimeout(5000);
    console.log(`Background requests during wait: ${networkRequests.length - beforeWait}`);
  });

  test('should identify what triggers during datepicker close', async ({ page }) => {
    // Track all console logs
    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        console.log(`[Browser] ${msg.text()}`);
      }
    });

    // Track state changes by intercepting React DevTools
    await page.goto('/processes?tab=instances');

    // Inject performance observer
    await page.evaluate(() => {
      // Track long tasks
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.log(`[LongTask] Duration: ${entry.duration}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      }
    });

    await page.waitForTimeout(2000);

    // Open filters
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }

    // Find and click any input that might trigger the issue
    const inputs = page.locator('input:visible');
    const inputCount = await inputs.count();

    console.log(`Found ${inputCount} visible inputs`);

    if (inputCount > 0) {
      // Click first input
      await inputs.first().click();
      await page.waitForTimeout(500);

      // Click away
      console.log('Clicking away from input...');
      await page.mouse.click(10, 10);

      // Try to measure any freeze
      const start = Date.now();
      await page.waitForTimeout(100);

      // Try to interact
      await page.mouse.move(100, 100);
      const end = Date.now();

      console.log(`Time after clicking away: ${end - start}ms`);
    }
  });
});
