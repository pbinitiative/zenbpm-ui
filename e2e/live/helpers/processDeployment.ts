import { expect, type APIResponse, type Page, type Response } from '@playwright/test';
import JSONBigInt from 'json-bigint';

export async function deployProcess(page: Page): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/v1/process-definitions'
      && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Deploy', exact: true }).click(),
  ]);
  return response;
}

export async function expectDeploymentRejected(page: Page, response: Response, message: string): Promise<void> {
  expect(response.status()).toBe(400);
  const error = await response.json() as { code: string; message: string };
  expect(error.code).toBe('BAD_REQUEST');
  expect(error.message).toContain(message);
  await expect(page.getByText(/Deployment failed:/).first()).toBeVisible();
  await expect(page.getByText('Process deployed successfully', { exact: true })).toHaveCount(0);
}

export async function expectDeploymentSaved(page: Page, response: Response, xml: string): Promise<void> {
  const body = await response.text();
  expect(response.ok(), `Deployment returned ${response.status()}: ${body}`).toBe(true);
  const result = JSONBigInt({ storeAsString: true }).parse(body) as { processDefinitionKey: string };
  expect(String(result.processDefinitionKey)).toMatch(/^\d+$/);
  await expect(page.getByText('Process deployed successfully', { exact: true })).toBeVisible();
  const definitionUrl = `/v1/process-definitions/${result.processDefinitionKey}`;
  let definition!: APIResponse;
  // A follower may not see the new definition immediately after deployment.
  await expect.poll(async () => {
    await definition?.dispose();
    definition = await page.request.get(definitionUrl, { timeout: 5000 });
    return { status: definition.status(), body: await definition.text() };
  }, {
    message: `Wait for deployed process definition ${result.processDefinitionKey} to become readable`,
    timeout: 10_000,
    intervals: [1000],
  }).not.toMatchObject({ status: 404 });
  const definitionBody = await definition.text();
  expect(definition.ok(), `Definition readback returned ${definition.status()}: ${definitionBody}`).toBe(true);
  const details = JSONBigInt({ storeAsString: true }).parse(definitionBody) as { bpmnData: string; version: number };
  expect(details.version).toBe(1);
  // Readback must retain exactly what was sent from the designer.
  expect(details.bpmnData).toBe(xml);
}
