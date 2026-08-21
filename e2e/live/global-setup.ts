import { fileURLToPath } from 'node:url';
import { request, type FullConfig } from '@playwright/test';
import { deployLiveResources } from './helpers/liveDeployment.ts';
import { setLiveDeploymentManifest } from './helpers/liveEnvironment.ts';
import {
  createProcessRunPrefix,
  PROCESS_RUN_PREFIX_ENV,
} from './helpers/processNaming.ts';

const GATEWAY_BPMN = fileURLToPath(
  new URL('./sources/1_GatewaysEvents/Process_gatewaysEventsTest.bpmn', import.meta.url),
);
const SALES_BPMN = fileURLToPath(
  new URL('./sources/2_MultiInstance_DMN/SalesCommissionPayouts.bpmn', import.meta.url),
);
const SALES_DMN = fileURLToPath(
  new URL('./sources/2_MultiInstance_DMN/ApproverDetermination.dmn', import.meta.url),
);

export default async function globalSetup(config: FullConfig): Promise<void> {
  const processRunPrefix = createProcessRunPrefix();
  process.env[PROCESS_RUN_PREFIX_ENV] = processRunPrefix;

  console.log(`[globalSetup] Process run prefix: ${processRunPrefix}`);

  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== 'string' || !baseURL) {
    throw new Error('The live Playwright project must configure use.baseURL.');
  }

  const api = await request.newContext({ baseURL });
  try {
    const manifest = await deployLiveResources(api, {
      gatewayBpmn: GATEWAY_BPMN,
      salesBpmn: SALES_BPMN,
      salesDmn: SALES_DMN,
    });
    setLiveDeploymentManifest(manifest);

    console.log(
      `[globalSetup] Deployed gateway=${manifest.gateway.processDefinitionKey}, ` +
        `sales=${manifest.sales.processDefinitionKey}, dmn=${manifest.sales.dmnResourceDefinitionKey}`,
    );
  } finally {
    await api.dispose();
  }
}
