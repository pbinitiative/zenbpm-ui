import { test, expect, type ConsoleMessage } from '@playwright/test';
import {
  SIMPLE_TASK_ACTIVE_INSTANCE_KEY,
  SIMPLE_TASK_ACTIVE_JOB_KEY,
  SIMPLE_TASK_BACKOFF_INSTANCE_KEY,
  SIMPLE_TASK_BACKOFF_JOB_KEY,
  SIMPLE_TASK_FAILED_JOB_KEY,
} from '../../src/mocks/data/well-known-keys';

/**
 * API Validation Tests
 *
 * These tests verify that all API responses match the OpenAPI schema.
 * They navigate to each page and check for validation errors in the console.
 *
 * Validation is performed by the OpenAPI validator which logs warnings
 * to the console when responses don't match the schema.
 */

test.describe('API Response Validation', () => {

  test('Home page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/');
    await waitForApiCalls(page);

    // Wait for content to load
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Processes page (definitions tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/processes');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Processes' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Processes page (instances tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/processes/instances');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Processes' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Definition Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use showcase-process which has rich data
    await page.goto('/process-definitions/3000000000000000033');
    await waitForApiCalls(page);

    // Wait for page content
    await expect(page.getByText('Definition Details')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use an instance from showcase-process
    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Wait for page content
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - Variables tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click Variables tab
    await page.getByRole('tab', { name: 'Variables' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - Jobs tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click Jobs tab
    await page.getByRole('tab', { name: 'Jobs' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - Incidents tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click Incidents tab
    await page.getByRole('tab', { name: 'Incidents' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - History tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click History tab
    await page.getByRole('tab', { name: 'History' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - statistics endpoint - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use the dedicated statistics instance: has activeCount + incidentCount on task-a.
    // This ensures the /process-instances/{key}/statistics endpoint is exercised
    // and its response is validated against the OpenAPI schema.
    await page.goto('/process-instances/3100000000000000250');
    await waitForApiCalls(page);

    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    // Wait for the BPMN diagram to load, which triggers the statistics request
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decisions page (definitions tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/decisions');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decisions page (instances tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/decisions/instances');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decision Definition Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a decision definition key
    await page.goto('/decision-definitions/3000000000000000001');
    await waitForApiCalls(page);

    // Wait for page content (look for DMN diagram or definition info)
    await page.waitForTimeout(2000); // Give time for API calls

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decision Instance Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a decision instance key
    await page.goto('/decision-instances/4000000000000000001');
    await waitForApiCalls(page);

    // Wait for page content
    await page.waitForTimeout(2000); // Give time for API calls

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('API Validation - Edge Cases', () => {

  test('Process with incidents - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a process that has incidents (simple-intermediate-message-catch-event-broken)
    await page.goto('/process-definitions/3000000000000000040');
    await waitForApiCalls(page);

    await expect(page.getByText('Definition Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Completed process instance - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a completed instance
    await page.goto('/process-instances/3100000000000000166');
    await waitForApiCalls(page);

    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Failed process instance - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a failed instance from broken process
    await page.goto('/process-instances/3100000000000000198');
    await waitForApiCalls(page);

    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});

// The engine stores a decision's output as raw JSON: an object for named
// outputs, an array for a collect hit policy, the bare value of a single
// unnamed output, null when no rule matched, or nothing at all.
test.describe('API Validation - decision output', () => {
  test('accepts a decision output of any JSON type, or none', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    const results = await page.evaluate(async () => {
      // @ts-expect-error browser-only module URL
      const { axiosResponseTransformer } = await import('/src/base/utils/jsonBigInt.ts');
      // @ts-expect-error browser-only module URL
      const { validateResponse } = await import('/src/mocks/validation/validator.ts');
      const valid = (fields: string) => (validateResponse(
        'GET',
        '/v1/decision-instances/4100000000000000001',
        axiosResponseTransformer(`{"key":4100000000000000001,"dmnResourceDefinitionKey":4000000000000000001${fields}}`)
      ) as { valid: boolean }).valid;
      const detail = ',"evaluatedAt":"2024-01-15T10:30:00Z","evaluatedDecisions":[]';
      const outputs = ['{"sport":"squash"}', '[{"discount":0.1},{"discount":0.05}]', '"squash"', '0', 'false', 'null'];
      return {
        outputs: outputs.map((output) => valid(`${detail},"decisionOutput":${output}`)),
        omitted: valid(detail),
        // Without its required fields, so that the endpoint's schema is known to apply
        withoutRequiredFields: valid(',"decisionOutput":{"sport":"squash"}'),
      };
    });

    expect(results).toEqual({
      outputs: [true, true, true, true, true, true],
      omitted: true,
      withoutRequiredFields: false,
    });
  });
});

// Delivery tokens are int64 counters, not keys: small JSON numbers which the
// response transformer leaves numbers and the validator checks as integers,
// while keys stay precision-preserving strings.
test.describe('API Validation - int64 counters', () => {
  test('Jobs with numeric delivery tokens - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/');
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    // The app's own client: MSW serializes the fixtures, json-bigint parses the
    // response and the interceptor validates it against the OpenAPI schema
    const jobs = await page.evaluate(async () => {
      // @ts-expect-error browser-only module URL
      const { AXIOS_INSTANCE } = await import('/src/base/openapi/axios-instance.ts');
      const response = await AXIOS_INSTANCE.get('/jobs', { params: { size: 100 } });
      const items = (response.data as { partitions: Array<{ items: Array<{ key: unknown; deliveryToken?: unknown }> }> })
        .partitions.flatMap((partition) => partition.items);
      return items.map(({ key, deliveryToken }) => ({ key, deliveryToken }));
    });
    await waitForApiCalls(page);

    // A job never handed out, one handed out once and one handed out three times
    expect(jobs).toEqual(expect.arrayContaining([
      { key: SIMPLE_TASK_ACTIVE_JOB_KEY, deliveryToken: 0 },
      { key: SIMPLE_TASK_BACKOFF_JOB_KEY, deliveryToken: 1 },
      { key: SIMPLE_TASK_FAILED_JOB_KEY, deliveryToken: 3 },
    ]));

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('refuses a delivery token sent as a string and a key sent as a number', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    const results = await page.evaluate(async (jobKey) => {
      // @ts-expect-error browser-only module URL
      const { axiosResponseTransformer } = await import('/src/base/utils/jsonBigInt.ts');
      // @ts-expect-error browser-only module URL
      const { validateResponse } = await import('/src/mocks/validation/validator.ts');
      const page = (job: string) => axiosResponseTransformer(
        `{"partitions":[{"partition":1,"totalCount":1,"items":[${job}]}],"page":1,"size":10,"count":1,"totalCount":1}`
      );
      const job = (key: string, deliveryToken: string) =>
        `{"key":${key},"elementInstanceKey":${jobKey},"elementId":"task","type":"t","elementType":"SERVICE_TASK",` +
        `"processInstanceKey":${jobKey},"state":"active","createdAt":"2026-01-01T00:00:00Z","inputVariables":{},` +
        `"deliveryToken":${deliveryToken}}`;
      const valid = (body: unknown) => (validateResponse('GET', '/v1/jobs', body) as { valid: boolean }).valid;
      return {
        numbers: ['0', '1', '2'].map((token) => valid(page(job(jobKey, token)))),
        stringToken: valid(page(job(jobKey, '"1"'))),
        numberKey: valid(page(job('42', '1'))),
      };
    }, SIMPLE_TASK_FAILED_JOB_KEY);

    expect(results).toEqual({ numbers: [true, true, true], stringToken: false, numberKey: false });
  });

  test('Jobs of a process instance with numeric delivery tokens - match the schema', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    const instances = await page.evaluate(async (processInstanceKeys) => {
      // @ts-expect-error browser-only module URL
      const { AXIOS_INSTANCE } = await import('/src/base/openapi/axios-instance.ts');
      // @ts-expect-error browser-only module URL
      const { validateResponse } = await import('/src/mocks/validation/validator.ts');
      return Promise.all(processInstanceKeys.map(async (processInstanceKey) => {
        const response = await AXIOS_INSTANCE.get(`/process-instances/${processInstanceKey}/jobs`);
        const { items } = response.data as { items: Array<{ key: unknown; deliveryToken?: unknown }> };
        const valid = (body: unknown) => (validateResponse(
          'GET', `/v1/process-instances/${processInstanceKey}/jobs`, body
        ) as { valid: boolean }).valid;
        // The same page with its delivery tokens as strings, which the schema must refuse
        const stringTokens = { ...response.data, items: items.map((job) => ({ ...job, deliveryToken: '1' })) };
        return {
          valid: valid(response.data),
          stringTokensValid: valid(stringTokens),
          jobs: items.map(({ key, deliveryToken }) => ({ key, deliveryToken })),
        };
      }));
    }, [SIMPLE_TASK_ACTIVE_INSTANCE_KEY, SIMPLE_TASK_BACKOFF_INSTANCE_KEY]);

    expect(instances).toEqual([
      {
        valid: true,
        stringTokensValid: false,
        jobs: expect.arrayContaining([{ key: SIMPLE_TASK_ACTIVE_JOB_KEY, deliveryToken: 0 }]),
      },
      {
        valid: true,
        stringTokensValid: false,
        jobs: expect.arrayContaining([{ key: SIMPLE_TASK_BACKOFF_JOB_KEY, deliveryToken: 1 }]),
      },
    ]);
  });

  test('sends a delivery token and int64 keys as JSON numbers, variables as entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    // The request transformer of the app's own client
    const body = await page.evaluate(async (jobKey) => {
      // @ts-expect-error browser-only module URL
      const { AXIOS_INSTANCE } = await import('/src/base/openapi/axios-instance.ts');
      const [transformRequest] = AXIOS_INSTANCE.defaults.transformRequest as Array<(data: unknown) => unknown>;
      return transformRequest({ jobKey, deliveryToken: 1, variables: { deliveryToken: '00123', jobKey: '00123' } });
    }, SIMPLE_TASK_BACKOFF_JOB_KEY);

    expect(body).toBe(
      `{"jobKey":${SIMPLE_TASK_BACKOFF_JOB_KEY},"deliveryToken":1,"variables":{"deliveryToken":"00123","jobKey":"00123"}}`
    );
  });
});

// Helper to collect validation errors from console
function createValidationErrorCollector(page: import('@playwright/test').Page) {
  const errors: string[] = [];

  const handler = (msg: ConsoleMessage) => {
    const text = msg.text();
    // Capture MSW Validator errors (now logged via console.error)
    if (text.includes('[MSW Validator]') && text.includes('Invalid')) {
      errors.push(text);
    }
  };

  page.on('console', handler);
  page.on('pageerror', (err) => {
    if (err.message.includes('[MSW Validator]')) {
      errors.push(err.message);
    }
  });

  return {
    errors,
    cleanup: () => page.off('console', handler),
  };
}

// Wait for network to be idle (all API calls completed)
async function waitForApiCalls(page: import('@playwright/test').Page) {
  // Wait for network idle
  await page.waitForLoadState('networkidle');
  // Additional wait to ensure all responses are processed
  await page.waitForTimeout(500);
}
