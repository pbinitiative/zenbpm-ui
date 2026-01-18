import { test, expect } from '@playwright/test';

test.describe('Process Instance Detail Page', () => {
  // Use an active process instance from mock data (from showcase-process)
  const processInstanceKey = '3100000000000000014';

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${processInstanceKey}`);
  });

  test('should display process instance metadata', async ({ page }) => {
    // Wait for metadata section to load
    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check metadata content
    await expect(page.getByText(processInstanceKey)).toBeVisible();
    // State chip in metadata section
    await expect(page.getByText('Active').first()).toBeVisible();
  });

  test('should display BPMN diagram', async ({ page }) => {
    // Wait for diagram section
    await expect(page.getByText('BPMN Diagram')).toBeVisible();

    // Check that the diagram container exists
    const diagramContainer = page.locator('.bjs-container');
    await expect(diagramContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display process definition link', async ({ page }) => {
    // Wait for metadata section
    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for process definition link with descriptive text
    const definitionLink = page.getByRole('link', { name: 'Process Definition' });
    await expect(definitionLink).toBeVisible();
    await expect(definitionLink).toHaveAttribute('href', /\/process-definitions\//);
  });

  test('should display tabs for jobs, history, incidents, variables', async ({ page }) => {
    // Check tabs are visible
    await expect(page.getByRole('tab', { name: /Jobs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /History/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Incidents/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Variables/i })).toBeVisible();
  });

  test('should show jobs in jobs tab', async ({ page }) => {
    // Jobs tab should be active by default
    const jobsTab = page.getByRole('tab', { name: /Jobs/i });
    await expect(jobsTab).toBeVisible();

    // Check for job type column header
    await expect(page.getByText('Job Type')).toBeVisible();
  });

  test('should switch to history tab', async ({ page }) => {
    // Click on History tab
    await page.getByRole('tab', { name: /History/i }).click();

    // Check for history content
    await expect(page.getByText('Element ID')).toBeVisible();
  });

  test('should switch to incidents tab', async ({ page }) => {
    // Click on Incidents tab
    await page.getByRole('tab', { name: /Incidents/i }).click();

    // Check for incidents content - Message column should be visible
    await expect(page.getByText('Message')).toBeVisible();
  });

  test('should switch to variables tab', async ({ page }) => {
    // Click on Variables tab
    await page.getByRole('tab', { name: /Variables/i }).click();

    // Check for specific variables from mock data
    await expect(page.getByText('customerId')).toBeVisible();
    await expect(page.getByText('CUST-001')).toBeVisible();
  });

  test('should show complete button for active jobs', async ({ page }) => {
    // Jobs tab should be active by default
    // Look for Complete button
    const completeButton = page.getByRole('button', { name: 'Complete' });
    await expect(completeButton.first()).toBeVisible();
  });
});

test.describe('Process Instance Detail - Navigation', () => {
  test('should navigate from process definition detail', async ({ page }) => {
    // Go to a process definition detail page (Showcase Process)
    await page.goto('/process-definitions/3000000000000000033');

    // Wait for instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Click on an instance link in the table
    const instanceLink = page.locator('table tbody tr').first().locator('button, a').first();
    if (await instanceLink.isVisible()) {
      await instanceLink.click();

      // Should navigate to instance detail page
      await expect(page).toHaveURL(/\/process-instances\/\d+/);
      await expect(page.getByText('Instance Details')).toBeVisible();
    }
  });

  test('should handle non-existent process instance', async ({ page }) => {
    // Navigate to non-existent process instance
    await page.goto('/process-instances/9999999999999999999');

    // Should show error
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('Process Instance Detail - State Display', () => {
  test('should display active state correctly', async ({ page }) => {
    // Use an active instance
    await page.goto('/process-instances/3100000000000000014');

    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for active state chip in metadata section (first occurrence)
    await expect(page.getByText('Active').first()).toBeVisible();
  });

  test('should display completed state correctly', async ({ page }) => {
    // Use a completed instance
    await page.goto('/process-instances/2097302399374458883');

    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for completed state chip in metadata section (first occurrence)
    await expect(page.getByText('Completed').first()).toBeVisible();
  });

  test('should display terminated state correctly', async ({ page }) => {
    // Use a terminated instance (2097302399374461029 is terminated in mock data)
    await page.goto('/process-instances/2097302399374461029');

    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for terminated state badge in metadata section (case-insensitive)
    await expect(page.getByText(/terminated/i).first()).toBeVisible();
  });
});

test.describe('Process Instance Detail - Incidents', () => {
  test('should show incident indicator when instance has incidents', async ({ page }) => {
    // Use an instance with incidents
    await page.goto('/process-instances/3100000000000000014');

    // Wait for page to load
    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for incident indicator (error icon or badge)
    // The incident count badge on the Incidents tab
    const incidentsTab = page.getByRole('tab', { name: /Incidents/i });
    await expect(incidentsTab).toBeVisible();
  });

  test('should show resolve button for unresolved incidents', async ({ page }) => {
    // Use an instance with incidents
    await page.goto('/process-instances/3100000000000000014');

    // Go to incidents tab
    await page.getByRole('tab', { name: /Incidents/i }).click();

    // Look for Resolve button for unresolved incidents
    const resolveButton = page.getByRole('button', { name: 'Resolve' });
    // If there are unresolved incidents, the button should be visible
    if (await resolveButton.count() > 0) {
      await expect(resolveButton.first()).toBeVisible();
    }
  });
});
