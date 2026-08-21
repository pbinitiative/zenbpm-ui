import { test } from '@playwright/test';
import {
  clickBpmElement,
  expectBpmElementSelected,
  expectBpmElementInstancesCount,
  expectBpmElementCompleted,
  expectBpmElementNotCompleted,
} from '../helpers/bpmDiagramAssertions.ts';
import { startProcessInstance } from '../helpers/bmpStartInstance.ts';
import { processBpmJobClick } from '../helpers/bpmJobsCompletions.ts';
import { bmpCheckCheckbox, bmpClickButton } from '../helpers/bmpDialogElements.ts';
import { openEventSubscriptionsTab, openJobsTab, triggerMessageSubscription } from '../helpers/bpmEventSubscriptions.ts';
import { processDefinitionUrl } from '../helpers/liveEnvironment.ts';

test.describe('Otestování gateways a klíčových eventů (Process_gatewaysEventsTest)', () => {

  // Variants
  const happyScenarios = [
    {
      // Variant 1
      name: 'Varianta1: Terminate end event',
      exclusiveCheckboxes: ['Otestovat event based gateway?'],
      inclusiveCheckboxes: ['Okamžité ukončení celé procesní instance?', 'Skončit po 2 min?'],
      errorCheckboxes: null as string[] | null,
      triggerMessage: false,
      expectedCompleted: ['TermineEndEvent'],
      expectedNotCompleted: [
        'EndEvent_KonecParalelniVetve1PresTimer',
        'EndEvent_KonecParalelniVetve1PresMessage',
        'EndEvent_KonecPodmineneFlowPo2min',
      ],
      endEventTimeout: 60000,
      testTimeout: 120000,
    },
    {
      // Variant 2
      name: 'Varianta2: Timer 60s + timer 2min + error event',
      exclusiveCheckboxes: ['Otestovat event based gateway?'],
      inclusiveCheckboxes: ['Skončit po 2 min?', 'Otestovat error event?'],
      errorCheckboxes: ['Error?'],
      triggerMessage: false,
      expectedCompleted: [
        'EndEvent_KonecParalelniVetve1PresTimer',
        'EndEvent_KonecPodmineneFlowPo2min',
        'ErrorBoundaryEvent',
        'EndEvent_KonecPodmineneFlowSErrorem',
      ],
      expectedNotCompleted: [
        'EndEvent_KonecPodmineneFlowBezErroru', // the boundary event interrupts the subprocess
        'EndEvent_KonecParalelniVetve1PresMessage',
        'EndEvent_KonecParalelniVetve1',
        'TermineEndEvent',
      ],
      endEventTimeout: 180000,
      testTimeout: 300000,
    },
    {
      // Variant 3
      name: 'Varianta3: Message + timer 2min',
      exclusiveCheckboxes: ['Otestovat event based gateway?'],
      inclusiveCheckboxes: ['Skončit po 2 min?'],
      errorCheckboxes: null as string[] | null,
      triggerMessage: true,
      expectedCompleted: [
        'EndEvent_KonecParalelniVetve1PresMessage',
        'EndEvent_KonecPodmineneFlowPo2min',
      ],
      expectedNotCompleted: [
        'EndEvent_KonecParalelniVetve1PresTimer', // the message got there first
        'EndEvent_KonecParalelniVetve1',
        'TermineEndEvent',
      ],
      endEventTimeout: 180000,
      testTimeout: 300000,
    },
  ];

  for (const s of happyScenarios) {
    test.describe(`Happy Path - ${s.name}`, () => {

      test('Process reaches the expected end events', async ({ page }) => {
        test.setTimeout(s.testTimeout);

        await page.goto(processDefinitionUrl('gateway'));

        // Start a new process instance with a random business key
        const businessKey = await startProcessInstance(page, {
          useRandomBusinessKey: true,
        });
        if (!businessKey) {
          throw new Error('The process instance did not receive a business key.');
        }

        console.log('Business Key:', businessKey);

        await clickBpmElement(page, 'ScriptTask_setCorrelationKey');
        await expectBpmElementSelected(page, 'ScriptTask_setCorrelationKey');
        console.log('Clicked on ScriptTask_setCorrelationKey and verified it is selected');

        // Select the process instance by its run-unique business key.
        await page
          .getByTestId('data-row')
          .filter({ hasText: businessKey })
          .locator('span.MuiTypography-root')
          .first()
          .click();
        let count = await expectBpmElementInstancesCount(page, 'ScriptTask_setCorrelationKey', 1, 30000);
        console.log('Number of BPM element instances: (ScriptTask_setCorrelationKey)', count);

        await processBpmJobClick(page, 'ScriptTask_setCorrelationKey', 'Complete Job');
        await bmpClickButton(page, 'Complete');
        console.log('Correlation key script task completed');


        // ParalellGateway opens both branches at once, so both decision tasks are active
        await clickBpmElement(page, 'UserTask_rozhodnutiProExclusiveGateway');
        await expectBpmElementSelected(page, 'UserTask_rozhodnutiProExclusiveGateway');

        count = await expectBpmElementInstancesCount(page, 'UserTask_rozhodnutiProExclusiveGateway', 1, 30000);
        console.log('Number of BPM element instances: (UserTask_rozhodnutiProExclusiveGateway)', count);

        // Paralelní větev č.1
        await processBpmJobClick(page, 'UserTask_rozhodnutiProExclusiveGateway');
        for (const label of s.exclusiveCheckboxes) {
          await bmpCheckCheckbox(page, label);
        }
        await bmpClickButton(page, 'Complete');
        console.log('Exclusive gateway decision completed:', s.exclusiveCheckboxes.join(', '));

        if (s.triggerMessage) {
          // Must happen before TimerEvent_60sec fires.
          await openEventSubscriptionsTab(page);
          await triggerMessageSubscription(page, 'MessageEvent');
          console.log('Triggered message on MessageEvent');
          await openJobsTab(page);
        }

        // Paralelní větev č.2
        await clickBpmElement(page, 'UserTask_rozhodnutiProInclusiveGateway');
        await expectBpmElementSelected(page, 'UserTask_rozhodnutiProInclusiveGateway');

        count = await expectBpmElementInstancesCount(page, 'UserTask_rozhodnutiProInclusiveGateway', 1, 30000);
        console.log('Number of BPM element instances: (UserTask_rozhodnutiProInclusiveGateway)', count);

        await processBpmJobClick(page, 'UserTask_rozhodnutiProInclusiveGateway');
        for (const label of s.inclusiveCheckboxes) {
          await bmpCheckCheckbox(page, label);
        }
        await bmpClickButton(page, 'Complete');
        console.log('Inclusive gateway decision completed:', s.inclusiveCheckboxes.join(', '));

        if (s.errorCheckboxes) {
          count = await expectBpmElementInstancesCount(page, 'SubProcess_ErrorEndEvent', 1, 30000);
          console.log('Number of BPM element instances: (SubProcess_ErrorEndEvent)', count);

          await processBpmJobClick(page, 'UserTask_rozhodnutiOVyskytuErroru');
          for (const label of s.errorCheckboxes) {
            await bmpCheckCheckbox(page, label);
          }
          await bmpClickButton(page, 'Complete');
          console.log('Sub process decision completed:', s.errorCheckboxes.join(', '));
        }

        // Verify the tokens ended where this variant expects them to
        for (const elementId of s.expectedCompleted) {
          await expectBpmElementCompleted(page, elementId, s.endEventTimeout);
          console.log('Reached:', elementId);
        }

        for (const elementId of s.expectedNotCompleted) {
          await expectBpmElementNotCompleted(page, elementId);
        }

        console.log('All expected end events reached for business key:', businessKey);
      });

    });
  }

  test.describe('Alternative Paths / Error Handling', () => {
    // Future non-happy path tests go here
  });

});
