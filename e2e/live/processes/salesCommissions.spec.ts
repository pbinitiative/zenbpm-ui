import { expect, test } from '@playwright/test';
import {
  clickBpmElement,
  expectBpmElementVisible,
  expectBpmElementSelected,
  expectBpmElementContainsText,
  expectBpmElementInstancesCount,
} from '../helpers/bpmDiagramAssertions.ts';
import { startProcessInstance } from '../helpers/bmpStartInstance.ts';
import { getBpmJobCount, setBpmJobFilter, processBpmJobClick } from '../helpers/bpmJobsCompletions.ts';
import { bmpCheckCheckbox, bmpClickButton, bmpSetInputValue, bmpSetSelection } from '../helpers/bmpDialogElements.ts';
import { processDefinitionUrl } from '../helpers/liveEnvironment.ts';

test.describe('Sales Commission Payouts - multiInstance ZEN (EN)', () => {

  const happyScenarios = [
    { name: 'Regular low', commissionType: 'Regular', amount: Math.floor(Math.random() * 499_999) + 1, approveCount: 1 },
    { name: 'Regular high', commissionType: 'Regular', amount: Math.floor(Math.random() * 499_999) + 500_001, approveCount: 2 },
    { name: 'VIP low', commissionType: 'VIP', amount: Math.floor(Math.random() * 499_999) + 1, approveCount: 1 },
    { name: 'VIP high', commissionType: 'VIP', amount: Math.floor(Math.random() * 499_999) + 500_000, approveCount: 1 },
  ];

  for (const s of happyScenarios) {
    test.describe(`Happy Path - ${s.name}`, () => {

      test('Fill Application user task can be selected', async ({ page }) => {
        await page.goto(processDefinitionUrl('sales'));

        // Start a new process instance with a random business key
        const businessKey = await startProcessInstance(page, {
          useRandomBusinessKey: true,
        });
        if (!businessKey) {
          throw new Error('The process instance did not receive a business key.');
        }

        console.log('Business Key:', businessKey);

        await expectBpmElementVisible(page, 'UserTask_FillApplication');

        await expectBpmElementContainsText(
          page,
          'UserTask_FillApplication',
          '(1) Fill Application'
        );

        // Click on the Filters button to open the filters panel
        await page.getByRole('button', { name: 'Filters' }).click();
        await setBpmJobFilter(page, businessKey);
        console.log('Filter set for Business Key result count:', await getBpmJobCount(page, businessKey));

        // Click on the filter and select the business key to filter the jobs
        await page
          .getByTestId('data-row')
          .filter({ hasText: businessKey })
          .locator('span.MuiTypography-root')
          .first()
          .click();

        await clickBpmElement(page, 'UserTask_FillApplication');
        await expectBpmElementSelected(page, 'UserTask_FillApplication');

        let count = await expectBpmElementInstancesCount(page, 'UserTask_FillApplication', 1, 30000); // Wait for the count to be by 1 higher with a timeout of 30 seconds
        //second instance number of the element, just to see if we have the right number of instances running
        console.log('Number of BPM element instances: (UserTask_FillApplication)', count);

        await processBpmJobClick(page, 'UserTask_FillApplication');

        await bmpSetSelection(page, 'Commission Type', s.commissionType);
        await bmpSetInputValue(page, 'Commission Amount', s.amount.toString());
        await bmpClickButton(page, 'Complete');
        console.log('Number of BPM element instances:', s.amount.toString());

        await clickBpmElement(page, 'UserTask_ApplicationApproval');
        await expectBpmElementSelected(page, 'UserTask_ApplicationApproval');
        for (let i = 0; i < s.approveCount; i++) {
          count = await expectBpmElementInstancesCount(page, 'UserTask_ApplicationApproval', s.approveCount === 1 ? 1 : `${i}/${s.approveCount}`, 30000);
          console.log('Number of BPM element instances: (UserTask_ApplicationApproval)', count);
          await processBpmJobClick(page, 'UserTask_ApplicationApproval');
          await bmpCheckCheckbox(page, 'Approve Payout');
          await bmpClickButton(page, 'Complete');
          console.log('Approved');
        }

        count = await expectBpmElementInstancesCount(page, 'ServiceTask_SendRequestForCommissionPayout', 1, 30000);
        console.log('Number of BPM element instances: (ServiceTask_SendRequestForCommissionPayout)', count);
        await processBpmJobClick(page, 'ServiceTask_SendRequestForCommissionPayout', 'Complete Job');
        await bmpClickButton(page, 'Complete');
        console.log('All tasks completed successfully for business key:', businessKey);

        // Verify it is completed
        await expect(page.locator('g[data-element-id="EndEvent_ApplicationApproved"]')).toHaveClass(/element-completed/);
      });

    });
  }

  test.describe('Alternative Paths / Error Handling', () => {
    // Future non-happy path tests go here
  });
});
