# Start event listener in the UI: manual test guide

This guide walks through the zenbpm-ui support for the engine's start event execution listener:
the **Execution listener** group of the designer's properties panel, and the Jobs tab, its
Complete and Fail dialogs and the Incidents tab for the job of such a listener.

The engine runs a listener in one position only: an `end` listener on a start event directly
under `<process>`. When a token reaches the start event, the engine creates the listener's job,
and the token waits there until a worker completes the job. The job's `elementType` is
`START_EVENT` and its `listenerEventType` is `end`. A listener job cannot throw a BPMN error,
and the variables sent with its completion stay on the job.

## 1. How to run this test

1. **Engine.** Start a zenbpm built from branch `feature/e13.6-execution-listeners` on
   `:8080`, for example `make run` in the zenbpm checkout. An engine without the listener
   ignores it, and the seeding script stops with a message saying so.
2. **No workers.** Make sure no job worker is connected for the `listener-demo-*` job types, or
   it will take the jobs away from the scenarios.
3. **Properties panel.** The designer's listener group comes from
   `@pbinitiative/zenbpm-js-properties-panel`. Until a release contains it, build the panel from
   its branch `feature/e13.6-execution-listeners` and install it into the UI locally, without
   committing that:

   ```bash
   cd <your zenbpm-js-properties-panel checkout> && pnpm build && pnpm pack
   cd <your zenbpm-ui checkout>
   # in package.json, pnpm.overrides:
   #   "@pbinitiative/zenbpm-js-properties-panel": "file:../zenbpm-js-properties-panel/pbinitiative-zenbpm-js-properties-panel-0.5.2.tgz"
   pnpm install
   ```

   Only scenario L1 needs the panel; L2 to L6 work with the released one too.
4. **UI.** `pnpm dev:live` (http://localhost:3000, proxies `/v1` to `localhost:8080`).
5. **Seed.** With the engine running, and Python 3.9 or newer (standard library only):

   ```bash
   python3 manual-test/start-listener/seed_start_listener_scenarios.py
   # options: --engine http://localhost:8080  --ui http://localhost:3000
   ```

   Every run deploys the process `listener-demo-order` once (start event *Order received* with
   a listener of type `listener-demo-started` and `retries="3"`, then the service task *Ship
   order*) and starts four fresh instances. It prints a link for each and writes the same table
   to `seeded-instances.md` next to the script, which git ignores. Seed again for fresh
   instances whenever a scenario has used one up.

## 2. Scenarios

### L1. Designer: the Execution listener group

No seeded data. Open **Designer → New process**.

1. Select the start event. The properties panel shows the group **Execution listener** with
   one field, **Type**, and no Retries.
2. Enter `order-started` in Type. **Retries** appears. Enter `3`.
3. Open the XML view or download the BPMN. The start event carries
   `<zenbpm:executionListeners><zenbpm:executionListener eventType="end" type="order-started" retries="3" /></zenbpm:executionListeners>`.
4. Enter `=jobType` in Type: the field shows *Enter the job type as a literal: a listener takes
   no FEEL expression*. Deploy: the deployment fails with *invalid execution listener
   eventType="end" on start event id="…": its type "=jobType" is an expression: a listener's
   type must be a literal*.
5. Enter `-1`, `1.5` and `2147483648` in Retries, one after another: each shows *Enter a whole
   number from 0 to 2147483647*. `2147483647` shows no error.
6. Set Type back to `order-started` and deploy. The deployment succeeds.
7. Clear Type. The listener disappears from the XML together with its retries, and Retries is
   no longer shown. Undo (Ctrl+Z) brings it back.
8. Add an expanded sub-process with a start event inside, and an event sub-process. Select their
   start events, then a task and the end event: none shows the **Execution listener** group,
   because the engine refuses a listener there at deployment.

### L2. A listener job waits, and completing it moves the token on

Open the L2 link.

1. The diagram and the History tab show *Order received* active; nothing behind it has run.
2. The Jobs tab lists one job, type `listener-demo-started`, with an **End listener** chip below
   the element. Hovering the chip explains that the token leaves the start event when this job
   is completed.
3. Click **Complete**. The dialog shows a note instead of the variables editor: the job takes no
   variables, and the instance's variables are changed on the Variables tab before completing.
4. Complete it. The success message appears. After the refresh the listener job is
   *Completed*, *Order received* is completed, and a new job `listener-demo-ship` waits at
   *Ship order*, without a chip.

### L3. Failing a listener job offers no error code

Open the L3 link, then the row menu (⋮) of the listener job → **Fail job**.

1. There is no **Error Code** field. A note says that a listener cannot throw a BPMN error, so
   the failure spends one attempt.
2. The outcome says the failure leaves 2 retries. Enter a message and fail the job.
3. The row shows *1 failed* under the retries; **Failure history** lists the failure with its
   message.

### L4. An incident on the start event, resolved by Retry

Open the L4 link.

1. The instance still reads active, waiting at *Order received*. The listener job is *Failed*
   with 0 retries and *3 failed*.
2. The Incidents tab shows an incident on *Order received*, with the last failure's message.
   Following it to the job lands on the listener job.
3. Row menu of the listener job → **Retry** → **Retry** (resolve the incident only). The job is
   *Active* again with the listener's 3 retries, and the incident is resolved.

### L5. A task's job keeps its dialogs

Open the L5 link. The job `listener-demo-ship` of *Ship order* waits; *Order received* is
completed, and its listener job is *Completed*.

1. The task's job has no chip.
2. **Complete** shows the variables editor, without the listener note.
3. **Fail job** shows the **Error Code** field.

### L6. Mocks (no engine)

`pnpm dev` (mocks mode) has the process *Start Listener* with an instance waiting for its
listener job (`3100000000000000310`) and one with a failed listener job and an incident
(`3100000000000000311`). Scenarios L2 steps 1 to 3, L3 and L4 can be followed there as well;
the mocks do not move the token on when a job is completed. They refuse a listener job's
failure with an error code with `400`, as the engine does.
