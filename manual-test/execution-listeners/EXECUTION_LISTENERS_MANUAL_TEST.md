# Execution listeners, engine and UI: manual test guide

This guide walks through the engine's execution listeners (zenbpm branch
`feature/e13.6-execution-listeners`) and what zenbpm-ui shows of them, by hand.

- **Part U** is done in the browser. It tests the engine and the UI together: you complete, fail
  and retry jobs in the UI, enter their variables as JSON, and read what the engine made of it on
  the Jobs, History, Incidents and Variables tabs.
- **Part T** is done in a terminal. It holds only what the UI has no button for: five short
  scenarios.

Every step says what to do, and then what you should see. Where what you see differs, that is a
finding.

What the engine does, in short:

- It runs `start` and `end` listeners on every element whose own work is one job: a service task,
  a send task, a user task, a business rule task done by a job worker, and a message intermediate
  throw event. None of them where the activity is multi-instance.
- It runs `end` listeners on a start event directly under `<process>`.
- It refuses a listener anywhere else at deployment, and ignores one on the process itself.
- Each listener is a job of its own. The jobs of one element follow each other, one at a time:
  its start listeners in the order of the model, the element's own job, its end listeners. The
  token leaves the element when the last of them is completed.
- What a `start` listener's job is completed with stays local to the element: the later start
  listeners and the element's own job see it, and it reaches the instance only where an output
  mapping of the element names it.
- What an `end` listener's job is completed with is written to the instance as it is, without an
  output mapping, in place of a variable of the same name. The later end listeners of the
  element see it too. The instance is the one the element runs in: for a task inside a
  sub-process that is the sub-process.
- A listener job cannot throw a BPMN error.

## 1. Before you start

### 1.1 What has to run

1. **Engine.** Start a zenbpm built from branch `feature/e13.6-execution-listeners` on `:8080`,
   for example `make run` in the zenbpm checkout. An empty database is fine: the seeding script
   deploys everything it needs. An engine which runs listeners on start events only refuses the
   processes of this guide, and one which still drops what an end listener's job is completed
   with fails the script's first check; either way the script stops with a message saying so.
   Build the engine again whenever the branch has moved.
2. **No workers.** Make sure no job worker is connected for the `listener-demo-*` job types, or
   it will take the jobs away from the scenarios.
3. **Properties panel.** The designer's listener group comes from
   `@pbinitiative/zenbpm-js-properties-panel`. Until a release contains it, the UI needs the
   panel built from its branch `feature/e13.6-execution-listeners` and installed locally (a
   `pnpm.overrides` entry in `package.json` naming the packed tarball, then
   `pnpm install --force` and a fresh `node_modules/.vite`). Only scenario U1 needs it.
4. **UI.** `pnpm dev:live` (http://localhost:3000, proxies `/v1` to `localhost:8080`).

### 1.2 Seed the test data

With the engine running, and Python 3.9 or newer (standard library only), run in the zenbpm-ui
checkout:

```bash
python3 manual-test/execution-listeners/seed_execution_listener_scenarios.py
```

You should see a table of eighteen instances with a link each, seven process definitions, and as
the last line `Written to`, followed by the path of `seeded-instances.md`. Open that file,
`manual-test/execution-listeners/seeded-instances.md`: **its links are what "open the U3 link"
means below.** Git ignores the file.

Before it seeds, the script checks that the engine is new enough for this guide: it starts one
instance of *Listener demo: order*, completes the listener of its start event with a variable,
looks for that variable in the instance, and cancels the instance. So the list of that process
shows one *Terminated* instance with the order `ORD-engine-check` for every run.

Every run starts fresh instances. Seed again whenever a scenario has used its instance up; the
processes are deployed once, a second run answers with the same definitions. To seed another
engine or name another UI, add `--engine http://localhost:8080 --ui http://localhost:3000` with
your addresses.

The script deploys the models of `manual-test/execution-listeners/models/`:

| Process | What it carries |
|---|---|
| *Listener demo: order* (`listener-demo-order`) | `OrderReceived` (start event): end listener `listener-demo-started`, retries 3. `ShipOrder` (service task): start listeners `listener-demo-reserve` and `listener-demo-credit`, the task's own job `listener-demo-ship`, end listeners `listener-demo-notify` (retries 2) and `listener-demo-archive`; a task header `carrier=post`, an input mapping from `orderId` to `shipmentOf`, an output mapping from `reserved` to the instance variable `stockReserved`, and an error boundary event `ShippingFailed` for the error code `SHIPPING_FAILED`. `ConfirmDelivery` (user task): start listener `listener-demo-prepare`, the task's own job `listener-demo-confirm`. |
| *Listener demo: every element* (`listener-demo-elements`) | A send task (`SendInvoice`), a business rule task done by a job worker (`RateCustomer`) and a message throw event (`InvoiceAnnounced`), each with a start listener, its own job, and an end listener. |
| *Listener demo: parcel* (`listener-demo-parcel`) | A service task with a start and an end listener inside a sub-process, whose output mapping writes `labelled` to the instance variable `parcelLabelled`; then a call activity calling `listener-demo-payment`. |
| *Listener demo: payment* (`listener-demo-payment`) | The called process: an end listener on its start event, a start listener on its service task. |
| *Listener demo: order by message* (`listener-demo-order-placed`) | A message start event (message `listener-demo-order-placed`) with two end listeners and an output mapping from `orderId` to `orderFromMessage`. |
| *Listener demo: listener on the process* (`listener-demo-process-listener`) | A listener on the `<process>` element itself, and a service task without listeners. |
| *Listener demo: fee* (`listener-demo-fee`) | `ChargeFee` (service task): start listener `listener-demo-fee-before`, the task's own job `listener-demo-fee`, and an input mapping `matches(orderId, pattern, flags)` to `isAnOrder`. The mapping fails once the variable `flags` holds a flag which FEEL's `matches` does not know. |

### 1.3 Where things are in the UI

The page of a process instance shows **Instance Details** (with the state, and **Cancel Process**
while the instance runs), the **BPMN Diagram**, and tabs below. The Jobs tab is the one this
guide uses most:

| What | Where |
|---|---|
| A job's listener | a chip **Start listener** or **End listener** under the element id; an element's own job has no chip |
| What a job received and was completed with | the badges **In** and **Out** in the column *Job input/output*; click one, and the dialog *Job input/output* lists the job's INPUTS and OUTPUTS |
| Completing a job | the **Complete** button of its row; the dialog *Complete Job* takes the variables in the editor **Variables (JSON)**, which starts as `{}`; replace that with your JSON and click **Complete** |
| Failing, retrying, assigning a job | the row menu (⋮): **Fail job**, **Retry**, **Update Retries**, **Assign**, **Failure history**, **View in history** |
| The instance's variables | the Variables tab; **Edit** and **Delete** on each row, **Add Variable** above |
| What an element received and gave back | the History tab; the badges **In** and **Out** in the column *Activity input/output* |

After a job is completed the table refreshes and shows the next job. If it does not show within
a second or two, reload the page.

**A fresh instance at any time.** Instead of seeding again, you can start an instance by hand:
**Processes** → *Listener demo: order* → **Start Instance** → enter `{"orderId": "ORD-1"}` under
**Process Variables (JSON)** → **Start** → **View Instance** in the message which appears. It
waits behind the listener of the start event, as U2 does.

## 2. Part U: in the UI

### U1. Designer: the Execution listeners group

No seeded data. Open **Designer → New process**, append a task to the start event and an end
event to the task, and change the task to a **Service task**.

**Where the group is offered**

1. Select the service task. The properties panel shows the group **Execution listeners**, empty,
   with a **Create** button. The start event shows it too.
2. Select the end event: no such group. The same holds for a gateway, a sub-process, a call
   activity, a receive task, a script task, and a start event inside a sub-process.
3. Change the task to a **Send task**, then a **User task**: the group stays. Change it to a
   **Business rule task**: the group is gone while **Implementation** is *DMN decision*. Choose
   *Job worker*: it is still gone, and comes back once the task definition has a **Type**. Without
   one the engine does not take the task for a job worker's. Change it back to a **Service task**.

**A chain on a task**

4. On the service task click **Create**. A listener appears, open, with **Event type** *Start*,
   an empty **Type** flagged *Enter the job type of the listener*, and **Retries**. The Type's
   description says a worker completes the job *before the element's own work starts*; the
   description of Retries says *Optional; the engine default when empty. The engine lowers a
   number above its configured maximum to that maximum.* The list item is labelled
   `⚠ Start: <no type>`: the ⚠ marks a flagged listener in the list.
5. While the Type is missing, the number beside the group's name is red, and stays red with the
   group collapsed. Enter `reserve-stock` in Type and `3` in Retries. The item is labelled
   `Start: reserve-stock`, without the ⚠, and the number is no longer red. The group stays open
   while you correct the value, and the field you type in stays where it is.
6. Click **Create** again: a second listener appears behind the first, open. Set its Event type
   to *End* and its Type to `notify-customer`. Its description now says *before the token leaves
   the element*, and it is labelled `End: notify-customer`. **Create** is still offered.
7. Open the XML view or download the BPMN. The task carries both listeners in the order of the
   list:
   `<zenbpm:executionListener eventType="start" type="reserve-stock" retries="3" />` and
   `<zenbpm:executionListener eventType="end" type="notify-customer" />`.
8. Deploy. The deployment succeeds.

**What is flagged, and what the engine says to it**

9. Add a third listener, *Start*, with Type `reserve-stock`. Both start listeners of that type
   show *Enter another job type: two listeners of one event type need different types*, and both
   list items carry the ⚠, so the collapsed list tells which listeners are flagged. Deploy:
   the deployment fails with *… has two execution listeners with eventType="start" and
   type="reserve-stock": the listeners of one event type need different types*. Set the third
   one to *End*: both errors go away, since the type differs from the other end listener's.
   Delete the third listener with the delete button of its list item.
10. Enter `=jobType` in a Type: *Enter the job type as a literal: a listener takes no FEEL
    expression*. Enter `-1`, `1.5` and `2147483648` in Retries, one after another: each shows
    *Enter a whole number from 0 to 2147483647*. `+3` shows no error: the engine reads a sign.
    Restore the values.
11. Clear a Type. The listener stays with its Retries, and Type is flagged again. Restore it.
12. Give the task the **Parallel multi-instance** marker (in the task's **Change element** menu,
    the wrench). The group loses
    **Create**, and each listener's Event type says *Remove this listener or the multi-instance
    marker: the engine runs no listener on a multi-instance activity*. That one reason is all a
    listener shows where the engine runs none: clear a Type, and no *Enter the job type* appears
    beside it; restore the Type. Deploy: the engine answers
    *execution listener eventType="start" on service task id="…" is not supported: execution
    listeners run on a service, send or user task, …, none of them multi-instance …*. Remove the
    marker again.
13. Select the task and open one of its listeners, then delete the sequence flow behind the
    task with the task still selected (select the flow, delete it, and select the task again
    only if the modeler moved the selection). Each Event type says *Connect an outgoing sequence
    flow: the token could not leave the element once the listener's job is completed*. Press
    Ctrl+Z: the flow is back and the error is gone at once, without selecting the task again.
14. Open the first listener of the task, then delete it with its delete button. The listener
    which moves up stays closed: an item keeps its state, whatever its position.

**A start event**

15. Select the start event and click **Create**. The listener's Event type is *End*, and *End* is
    the only option: a start event takes end listeners only. Give it the Type `order-started`.
    **Create** stays, so a start event can carry several end listeners.
16. In the XML view, change that listener to `eventType="start"`, switch back and select the
    start event. The Event type reads *Start* and says *Choose End: a start event takes only end
    listeners*. Deploy: *execution listener eventType="start" on start event id="…" is not
    supported: a start event takes listeners with eventType="end"*. Now change it to
    `eventType="End"`, with a capital E, and switch back. The engine compares the event type as
    it is written, so this is another than the *End* it runs: the Event type shows it in quotes,
    `"End"`, as one more option beside *End*, the item is labelled `⚠ "End": order-started`, and
    the message is the same *Choose End: …*. Choose *End*.
17. Add an expanded sub-process, drag the start event with its listener into it and select it.
    The group is still shown, without **Create**; Event type says *Remove this listener: the
    engine runs a listener on a start event only directly under the process*. Delete the
    listener, and the group disappears. Undo (Ctrl+Z) both steps.

**What an imported model can carry**

18. In the XML view, give the task a second `<zenbpm:executionListeners>` element beside the
    first, with one listener in it, and switch back. The group lists the listeners of both
    elements in their order. Delete the only listener of the first element: the one of the
    second stays, in the list and in the XML.
19. In the XML view, add `retryBackoff="=backoff"` to a listener and switch back. The listener
    shows a **Retry backoff** field, flagged *Enter the retry backoff as a literal*, and the
    number of the group is red. Enter `P1M`: *Enter the retry backoff in weeks, days, hours,
    minutes or seconds*. Enter `PT99999999999999999999S`: *Enter smaller numbers: the engine reads
    none above 9223372036854775807*. Enter `PT10S,PT1M`: no error. A listener without the
    attribute shows no such field.
20. In the XML view, delete the `<bpmn:outgoing>` line of the task and leave the sequence flow
    itself, then switch back and select the task. The flow is drawn as before, but the model no
    longer names it as outgoing of the task, and that is what the engine follows. Each Event
    type says *Draw the outgoing sequence flow again: the model does not name it as outgoing of
    this element, which is what the engine follows*. Delete the flow and draw it again: the
    message is gone.
21. Click **Import** and choose `models/listener-demo-process-listener.bpmn`, whose
    `<bpmn:process>` carries an `executionListeners` element. Click the empty canvas beside the
    diagram, which selects the process. The group lists the listener as `Start:
    listener-demo-never-run` and does not flag it: no ⚠ and no red number. Open the listener:
    under Event type a note says *The engine runs no listener on the process itself and ignores
    this one. It can be removed.* Its delete button removes it, and there is no **Create**. In a
    model with a pool around the process, the pool shows the same.
22. Click **Import** and choose `models/refused/09-task-listener.bpmn`, a user task with a task
    listener, which this engine does not run. Select the user task. The group lists
    `⚠ Task listener "completing": listener-demo-refused` with a red number. Open the item: it has
    nothing to edit, only the reason *Remove this listener: the engine runs no task listener*.
    **Create** is still offered, for an execution listener. Delete the item with its delete
    button: the task listener leaves the list and the XML.
23. Click **Import** and choose `models/refused/13-camunda-7-shape.bpmn`, whose service task
    carries a `camunda:executionListener` directly in its extension elements, as Camunda 7 writes
    one. Select the service task. The group lists
    `⚠ Listener outside executionListeners: org.example.ReserveStock` with the reason *Remove this
    listener: the engine refuses an execution listener outside an executionListeners element*.
24. Reload the page (confirm, should the browser ask whether to leave it), so that the panel
    forgets which groups you opened, and import
    `models/refused/09-task-listener.bpmn` once more. Select the user task: the group opens by
    itself, because it holds a flagged listener. Reload again, import
    `models/listener-demo-process-listener.bpmn` and click the empty canvas: the group stays
    closed, because the listener on the process is not flagged. A group which was opened once,
    by itself or by you, stays open on the elements you select afterwards until you close it.

### U2. A start event's listener waits, and completing it moves the token on

Open the U2 link.

1. The instance reads *Active*. The diagram and the History tab show `OrderReceived` active;
   nothing behind it has run.
2. The Jobs tab lists one job, type `listener-demo-started`, on `OrderReceived` with an **End
   listener** chip and 3 retries. Hovering the chip explains that the token leaves the element
   once the jobs of all its end listeners are completed. The keyboard reaches the same
   explanation: click into the table and press Tab until the chip has the focus.
3. Click **Complete**. A note above the variables editor says that the variables of an end
   listener are written to the instance as they are, without an output mapping, that they
   replace variables of the instance with the same name, and that the later end listeners of
   the element receive them too. Close the dialog with **Cancel**.
4. Open the History tab. The row of `OrderReceived` has a row menu (⋮) with **View related
   jobs**, which leads back to the listener job on the Jobs tab.
5. Click **Complete** again, replace `{}` with `{"fromStartListener": 1}` and click
   **Complete**. A message *Job completed successfully* appears. The listener job is
   *Completed*, and its **Out** badge reads 1: the dialog shows `fromStartListener` under
   OUTPUTS.
6. Open the Variables tab: it shows `orderId` and `fromStartListener: 1`. What the listener of
   the start event was completed with reached the instance, although the start event has no
   output mapping.
7. Open the History tab. `OrderReceived` is *Completed*, and its **Out** badge reads 1: the
   dialog *Activity input/output* shows `fromStartListener` under OUTPUTS.
8. Back on the Jobs tab, a new job `listener-demo-reserve` waits at `ShipOrder` with a **Start
   listener** chip. Click its **In** badge: INPUTS holds `orderId`, `shipmentOf` and
   `fromStartListener`. The element behind the start event sees what its listener wrote.

### U3. The chain of a task, one job at a time, and where its variables go

Open the U3 link. `OrderReceived` is completed, and `ShipOrder` is active.

1. The Jobs tab shows one job of `ShipOrder`: `listener-demo-reserve` with a **Start listener**
   chip. Neither `listener-demo-credit` nor the task's own job `listener-demo-ship` exists yet.
   Hovering the chip explains that the element's own work begins once the jobs of all its start
   listeners are completed.
2. Click its **In** badge. INPUTS holds `orderId` and `shipmentOf`, both with the order's id: a
   start listener sees the result of the task's input mapping.
3. Click **Complete**. The note says the variables stay local to the element. Enter
   `{"reserved": true}` and complete.
4. `listener-demo-credit` waits, again with a **Start listener** chip. Click its **In** badge:
   INPUTS holds `orderId`, `shipmentOf` and `reserved: true`. Open the Variables tab: it does
   **not** show `reserved`. No output mapping has run yet.
5. Complete `listener-demo-credit` without variables (leave `{}`). Now `listener-demo-ship`
   waits, **without a chip**: it is the task's own job. Its **In** badge shows `reserved` as
   well. Its **Complete** dialog shows the variables editor without a note. Its row menu →
   **Fail job** shows an **Error Code** field, and the help of **Backoff** names *the task
   definition's backoff*; close that dialog with **Cancel**.
6. Complete `listener-demo-ship` with `{"trackingId": "TRK-1"}`. Open the Variables tab: it
   shows `orderId` and `stockReserved: true`, and neither `reserved` nor `trackingId`. The
   output mapping of the task wrote the start listener's `reserved` to the instance as
   `stockReserved`; nothing else of the task's jobs reached the instance.
7. Open the History tab. `ShipOrder` is still *Active*, although its own job is done, and its
   **Out** badge reads 1: the dialog *Activity input/output* shows `stockReserved: true` under
   OUTPUTS.
8. Back on the Jobs tab, `listener-demo-notify` waits with an **End listener** chip and 2
   retries. Click its **In** badge: INPUTS holds `orderId`, `shipmentOf`, `reserved`,
   `trackingId` and `stockReserved`. An end listener sees the instance as the output mapping
   left it, the element's local variables, and what the task's job was completed with.
9. Click **Complete** on `listener-demo-notify`. The note says the variables are written to
   the instance as they are, without an output mapping. Enter `{"notified": "by-mail"}` and
   complete. Then `listener-demo-archive` waits; its **In** badge shows `notified` among its
   INPUTS.
10. Open the Variables tab: it shows `orderId`, `stockReserved: true` and `notified: by-mail`.
    No output mapping of the task names `notified`: what an end listener is completed with
    reaches the instance as it is. `reserved` and `trackingId` are still not there.
11. Open the History tab. `ShipOrder` is still *Active*, and its **Out** badge now reads 2:
    `stockReserved` and `notified`. The history shows what the end listener wrote beside what
    the output mapping wrote.
12. Complete `listener-demo-archive` with `{"stockReserved": false}`. `ShipOrder` is *Completed*
    in the History, and the Variables tab shows `stockReserved: false`: an end listener replaces
    a variable of the instance with the same name.
13. `listener-demo-prepare` waits at `ConfirmDelivery` with a **Start listener** chip. Click its
    **In** badge: INPUTS holds `orderId`, `stockReserved: false` and `notified`, and neither
    `reserved` nor `trackingId`. What the start listeners and the task's own job were completed
    with ended with the task; what the end listeners were completed with stayed in the
    instance.
14. The Jobs tab lists the five jobs of `ShipOrder` in the order they ran, newest on top: two
    **Start listener** chips, one job without a chip, two **End listener** chips.

### U4. Several jobs of one element

Open the U4 link. `ShipOrder` waits behind its first end listener, `listener-demo-notify`; its
two start listeners and its own job are completed.

1. The Jobs tab shows four jobs on `ShipOrder`: two with a **Start listener** chip, one without
   a chip, one with an **End listener** chip.
2. History tab → row of `ShipOrder` → row menu → **View related jobs**. The Jobs tab opens with
   all four jobs of `ShipOrder` highlighted, and not the job of `OrderReceived`.
3. Row menu of any of the four → **View in history** highlights the one row of `ShipOrder`.
4. On the Jobs tab, set **Rows per page** to 5. The instance has five jobs, one page. Open the
   U11 link instead, which has seven: with five rows to a page, the jobs of `ShipOrder` lie on
   both pages. History → `ShipOrder` → **View related jobs**: the jobs of `ShipOrder` on the
   page shown are highlighted, and a message says *Jobs of this element are also on other pages
   of the Jobs tab: 2*.
5. Still on U11 with five rows to a page, go to page 2 of the Jobs tab, then History →
   `OrderReceived` → row menu. **View related jobs** is offered although the listener job of the
   start event is on page 1, and leads there.

### U5. Failing a listener's job offers no error code

Open the U5 link, then the row menu (⋮) of the listener job → **Fail job**.

1. There is no **Error Code** field. A note says that a listener cannot throw a BPMN error, so
   the failure spends one attempt.
2. The outcome says *The failure spends one attempt and leaves 2 retries*, and does not speak
   of an error code, which this dialog has no field for. The **Backoff** field's help says it
   overrides *the listener's backoff*. Enter a message and click **Fail job**.
3. The job stays *Active*, with 2 retries and *1 failed* under them. Row menu → **Failure
   history** lists the failure with its message.

### U6. An incident on the start event, resolved by Retry

Open the U6 link.

1. The instance still reads *Active*, waiting at `OrderReceived`. The listener job is *Failed*
   with 0 retries and *3 failed*.
2. The Incidents tab shows an incident on `OrderReceived`, with the last failure's message.
   Following it to the job lands on the listener job.
3. Row menu of the listener job → **Retry**. The hint says that resolving the incident restores
   *the retries of the listener*. Click **Retry**. The job is *Active* again with the listener's
   3 retries, and the incident is resolved.

### U7. An incident of a task's listener leads to exactly its job

Open the U7 link. `listener-demo-notify` spent its 2 retries.

1. The instance reads *Active*. The Jobs tab shows `listener-demo-notify` *Failed* with 0 retries
   and *2 failed*; the three jobs before it are completed.
2. The Incidents tab shows one incident on `ShipOrder`, whose **Job** column names the key of
   `listener-demo-notify`. Click it. The Jobs tab opens with **only that job** highlighted,
   although all four jobs belong to the same element; the address bar carries
   `focusElementInstanceKey` and `focusJobKey`.
3. In the address bar, delete `focusElementInstanceKey=` with its value and the `&` behind it,
   so that the address names the job alone, and press Enter. The same job is highlighted again:
   a job is found by its key, with or without its element instance.
4. Row menu of the failed job → **Retry**. The hint names *the retries of the listener*. Click
   **Retry**. The job is *Active* again with 2 retries, the listener's and not the one retry of
   the task's own job, and the incident is resolved. No completed job of the task is active
   again: the engine runs no completed listener a second time.

### U8. Resolving an incident keeps what earlier listeners added

Open the U8 link. `ShipOrder` waits behind its second start listener, `listener-demo-credit`.
The first, `listener-demo-reserve`, is completed; its **Out** badge shows `reserved: true`.

1. Row menu of `listener-demo-credit` → **Fail job**. The outcome says *This failure leaves no
   retries: the job fails with an incident*: the listener has no `retries` attribute, so it has
   the engine's default of one attempt. Enter `credit service down` as the message and click
   **Fail job**.
2. The job is *Failed* with 0 retries and *1 failed*. The instance still reads *Active*, and the
   Incidents tab counts 1.
3. Open the Incidents tab. One incident stands on `ShipOrder`, *Unresolved*; its **Job** column
   names the key of `listener-demo-credit`, and its message reads
   `credit service down (job …: 1 attempt, retries exhausted)`.
4. Correct a variable which the task's input mapping reads: Variables tab → row `orderId` →
   **Edit** → replace the value with `ORD-CORRECTED` → **Save**. A message *Variable updated
   successfully* appears.
5. Jobs tab → row menu of the failed job → **Retry** → **Retry**. A message *Job handed back to
   its workers* appears. `listener-demo-credit` is *Active* again with 1 retry, under the same
   key as before. The tab still lists three jobs: there is no second `listener-demo-reserve`. A
   completed listener does not run again.
6. Click the **In** badge of `listener-demo-credit`. INPUTS holds `orderId: ORD-CORRECTED`,
   `shipmentOf: ORD-CORRECTED` and `reserved: true`. The input mapping was evaluated again with
   the corrected variable, and what the earlier listener added was kept.
7. The Incidents tab shows the incident *Resolved*. History tab → **In** badge of `ShipOrder`:
   INPUTS holds `orderId: ORD-CORRECTED`.

### U9. A BPMN error of the task's own job leaves by the boundary event, without end listeners

Open the U9 link. `ShipOrder` waits behind its own job, `listener-demo-ship`; both start
listeners are completed.

1. Row menu of `listener-demo-ship` → **Fail job**. Unlike a listener's job (U5), the dialog has
   an **Error Code** field. Enter `SHIPPING_FAILED`. The outcome now says that the failure
   throws a BPMN error and that no retry is spent. Click **Fail job**.
2. Reload the page. The instance reads *Completed*, and the diagram marks the token's way over
   the boundary event *Shipping failed* to *Order not shipped*.
3. The Jobs tab shows four jobs: `listener-demo-ship` *Terminated*, and the two start listeners
   and the listener of the start event *Completed*. There is no `listener-demo-notify` and no
   `listener-demo-archive`: an element left by a boundary event runs no end listener.
4. The History tab lists `OrderReceived`, `ShipOrder`, `ShippingFailed` and `OrderNotShipped`,
   and no `ConfirmDelivery`.
5. The Variables tab shows `orderId` alone. There is no `stockReserved`: the output mapping of
   the task was not applied.

### U10. Cancelling terminates the job the element waits for

Open the U10 link. `ShipOrder` waits behind its first end listener, `listener-demo-notify`.

1. Click **Cancel Process** under *Instance Details*, and **Yes** in the dialog. A message
   *Process cancelled successfully* appears.
2. Reload the page. The instance reads *Terminated*. `listener-demo-notify` is *Terminated* and
   keeps its **End listener** chip; the four jobs before it are still *Completed*; there is no
   `listener-demo-archive`.
3. The row of `listener-demo-notify` has no **Complete** button, and its row menu offers only
   **View in history** and **Failure history**.

### U11. A user task: Assign belongs to the task's own job

Open the U11 link. `ConfirmDelivery` waits behind its start listener.

1. The Jobs tab shows `listener-demo-prepare` on `ConfirmDelivery` with a **Start listener**
   chip. The user task has no job of its own yet. The row menu of the listener job offers
   **Update Retries** and **Fail job**, and **no Assign**.
2. Complete the listener job. `listener-demo-confirm` appears, without a chip. Its row menu
   offers **Assign**; assign it to somebody. The listener's row still offers none.
3. Complete `listener-demo-confirm`. The instance reads *Completed*.

### U12. A send task, a business rule task and a message throw event

Open the U12 link, an instance of *Listener demo: every element*.

1. The Jobs tab shows one job, `listener-demo-invoice-before` on `SendInvoice`, with a **Start
   listener** chip. Its row menu (⋮) offers **View in history**, **Update Retries**, **Failure
   history** and **Fail job**, and no **Assign**.
2. Click **Complete**: the note says the variables stay local to the element. Complete it.
   Then `listener-demo-invoice` waits **without a chip**; its Complete dialog has no note.
   Complete it. Then `listener-demo-invoice-after` waits with an **End listener** chip.
   Complete it.
3. Go on the same way through `listener-demo-rating-before`, `listener-demo-rating` and
   `listener-demo-rating-after` on `RateCustomer`, and `listener-demo-announce-before`,
   `listener-demo-announce` and `listener-demo-announce-after` on `InvoiceAnnounced`. Each
   element shows the same three: a **Start listener** chip, no chip, an **End listener** chip.
   None of the nine row menus offers **Assign**.
4. After the last completion the instance reads *Completed*, and the Jobs tab lists nine
   completed jobs.
5. History tab → row menu of `SendInvoice` → **View related jobs**: the Jobs tab opens with the
   three jobs of `SendInvoice` highlighted. The rows of `RateCustomer` and `InvoiceAnnounced`
   offer **View related jobs** too.

### U13. Listeners in a sub-process and in a called process

Open the U13 link, an instance of *Listener demo: parcel*. It waits in its sub-process *Pack
parcel*.

1. The Jobs tab shows a heading *Subprocess:* with a key and `PackParcel`, and under it one job:
   `listener-demo-label-before` on `PrintLabel` with a **Start listener** chip. Listeners run
   on a task inside a sub-process.
2. Complete it. `listener-demo-label` waits without a chip; complete it.
   `listener-demo-label-after` waits with an **End listener** chip; complete it with
   `{"labelled": true, "labelSize": "A6"}`.
3. Open the Variables tab. Its first rows are the variables of the process: `parcel` and
   `parcelLabelled: true`. Under a heading *Subprocess:* with a key and `PackParcel` it lists
   the variables of the sub-process: `labelSize`, `labelled: true` and `parcel`. The end
   listener wrote both of its variables to the instance its task runs in, which is the
   sub-process. From there a variable reaches the process as every variable of a sub-process
   does, where an output mapping of the sub-process names it: `labelled` as `parcelLabelled`,
   `labelSize` not at all. On the History tab, under the same heading, the **Out** badge of
   `PrintLabel` reads 2.
4. The diagram shows the sub-process completed and *Charge customer* active. The tab **Called
   Processes** now counts 1. Open it: one row, *listener-demo-payment*, *Active*, of the type
   *Call Activity*.
5. Click that row. The page of the called instance opens: *Listener demo: payment*, type *Call
   Activity*. Its Jobs tab shows one job, `listener-demo-payment-started` on `PaymentRequested`
   with an **End listener** chip. A process started by a call activity waits at the listener of
   its start event as well.
6. Complete it with `{"paymentRef": "PAY-1"}`. The Variables tab of the called instance shows
   `paymentRef: PAY-1` beside `parcel` and `parcelLabelled`, which the call activity handed
   over. `listener-demo-charge-before` waits on `ChargeCard` with a **Start listener** chip;
   complete it. `listener-demo-charge` waits without a chip; complete it. The called instance
   reads *Completed*.
7. Click **Parent Process Instance** under *Instance Details*. The parcel instance reads
   *Completed*. Its Variables tab shows no `paymentRef`: the call activity has no output
   mapping, so nothing of the called process reaches its caller.

### U14. A message start event with two end listeners

No seeded instance: a message starts it. The UI has no button which publishes a message that
starts a process, so this one step is a request from a terminal.

1. Run in a terminal:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/v1/messages -H 'Content-Type: application/json' -d '{"messageName": "listener-demo-order-placed", "correlationKey": "ORD-U14", "variables": {"orderId": "ORD-U14", "note": "fragile"}}'
   ```

   You should see `201` at once: the answer does not wait for the listener's job.
2. In the UI: **Processes** → *Listener demo: order by message*. The list of its instances
   shows the new one on top, *Active*. Click its row.
3. The instance waits at `OrderPlaced`. The Jobs tab shows one job,
   `listener-demo-placed-first`, with an **End listener** chip; the second listener's job does
   not exist yet.
4. The Variables tab shows `orderFromMessage: ORD-U14` alone: the output mapping of the start
   event was applied before the listener ran.
5. Set an instance variable while the listener waits, as a worker would: Variables tab → **Add
   Variable** → **Variable Name** `priority`, **Value (JSON)** `"high"` (with the quotes: the
   value is JSON) → **Add**. A message *Variable added successfully* appears.
6. Complete `listener-demo-placed-first` with `{"checked": true, "priority": "low"}`. Then
   `listener-demo-placed-second` waits with an **End listener** chip. Click its **In** badge:
   INPUTS holds `checked: true`, `orderFromMessage` and `priority: low`. The second end
   listener sees what the first was completed with.
7. The Variables tab shows `orderFromMessage`, `checked: true` and `priority: low`. The
   completion wrote both variables to the instance, and `priority` in place of the value set
   by hand in step 5.
8. Complete `listener-demo-placed-second` with `{"second": true}`. `listener-demo-handle` waits
   on `HandleOrder` without a chip. Its **In** badge shows `orderFromMessage`, `checked`,
   `priority: low` and `second`: what both listeners of the start event wrote is in the
   instance when the first task runs.
9. History tab → **Out** badge of `OrderPlaced`: OUTPUTS holds `orderFromMessage`, which the
   output mapping wrote, and `checked`, `priority` and `second`, which the listeners wrote.

### U15. A listener on the process itself is deployed and never run

Open the U15 link, an instance of *Listener demo: listener on the process*. Its `<process>`
element carries a `start` listener of the type `listener-demo-never-run`; the seeding script
deployed it without a refusal.

1. The Jobs tab shows one job, `listener-demo-audit` on `WriteAudit`, without a chip. There is
   no job `listener-demo-never-run`.

### U16. What a deployment refuses

The directory `manual-test/execution-listeners/models/refused/` holds thirteen models, each with
one listener the engine does not take. The designer shows the engine's reason; **Upload BPMN** on
the Processes page shows only *Request failed with status code 400*, so use the designer here.

1. Open **Processes** → **New Process**. Click **Import** at the bottom right and choose
   `models/refused/01-manual-task.bpmn`. A message *File loaded successfully* appears, and the
   diagram shows *Begin*, *Refused*, *Done*. The message lies over the **Deploy** button: close
   it with its ✕, or wait until it goes away.
2. Click **Deploy**. A message *Deployment failed. Check console for details.* appears, and the
   **Console** opens at the bottom with the engine's answer, written in capitals. It ends with
   the text of the table below for this model.
3. Do the same with `09-task-listener.bpmn` and `13-camunda-7-shape.bpmn`, whose listeners the
   designer cannot create and only lists with the reason (U1, steps 22 and 23), and with as many
   of the others as you like. T5 deploys all thirteen with one command.

   | Model | The engine's message ends |
   |---|---|
   | `01-manual-task` | `execution listener eventType="end" on manual task id="Refused" is not supported: execution listeners run on a service, send or user task, a business rule task with a task definition and a message throw event, none of them multi-instance (eventType="start" or "end"), and on a start event directly under the process (eventType="end")` |
   | `02-gateway` | `execution listener eventType="start" on exclusive gateway id="Refused" is not supported: …` (the same list) |
   | `03-start-listener-on-start-event` | `execution listener eventType="start" on start event id="Begin" is not supported: a start event takes listeners with eventType="end"` |
   | `04-same-event-type-and-type-twice` | `service task id="Refused" has two execution listeners with eventType="start" and type="listener-demo-refused": the listeners of one event type need different types` |
   | `05-multi-instance-task` | `execution listener eventType="start" on service task id="Refused" is not supported: …` (the same list) |
   | `06-no-outgoing-flow` | `service task id="Refused" has an execution listener but no outgoing sequence flow: the token could not leave it when the listener's job is completed` |
   | `07-business-rule-task-calling-a-decision` | `execution listener eventType="start" on business rule task id="Refused" is not supported: …` (the same list) |
   | `08-start-event-of-a-sub-process` | `execution listener eventType="end" on start event id="InnerBegin" is not supported: …` (the same list) |
   | `09-task-listener` | `task listener on user task id="Refused" is not supported: the engine runs no task listeners` |
   | `10-feel-expression-as-type` | `invalid execution listener eventType="start" on service task id="Refused": its type "=jobType" is an expression: a listener's type must be a literal` |
   | `11-blank-type` | `invalid execution listener eventType="start" on service task id="Refused": its type is blank: a listener needs the job type as a literal` |
   | `12-retries-not-a-number` | `invalid execution listener eventType="start" on service task id="Refused": retries "many" is not an integer` |
   | `13-camunda-7-shape` | `execution listener without an eventType on service task id="Refused" is not supported where it sits: a listener has to sit in an executionListeners element directly inside the extensionElements of its element` |

4. Open **Processes**. The list shows the seven processes of 1.2 and none whose name starts with
   *Refused:*. A refused deployment stores nothing.

### U17. A listener's job survives a restart of the engine

Open the U17 link. `ShipOrder` waits behind its second start listener, `listener-demo-credit`;
the first was completed with `reserved: true`.

1. Note the keys of the three jobs on the Jobs tab.
2. Stop the engine (Ctrl+C in its terminal) and start it again. Reload the page until it shows
   the instance again.
3. The Jobs tab shows the same three jobs with the same keys and states:
   `listener-demo-credit` still *Active*, and no second `listener-demo-reserve`. The start of
   the engine did not run a completed listener again.
4. The **In** badge of `listener-demo-credit` still shows `reserved: true`.
5. Complete `listener-demo-credit`. The task's own job `listener-demo-ship` waits.

### U18. A resolution refused while the input mapping of the task fails

Open the U18 link, an instance of *Listener demo: fee*. `ChargeFee` waits behind its start
listener, `listener-demo-fee-before`. The input mapping of the task reads the variables
`orderId`, `pattern` and `flags`; with the flag `i` it evaluates.

1. Click the **In** badge of `listener-demo-fee-before`: INPUTS holds `isAnOrder: true`, the
   result of the input mapping, beside `orderId`, `pattern` and `flags`. Complete the job
   without variables. `listener-demo-fee` waits without a chip: the task's own job.
2. Row menu of `listener-demo-fee` → **Fail job** → enter `fee service down` as the message →
   **Fail job**. The job is *Failed* with 0 retries, and the Incidents tab counts 1.
3. Break the input mapping: Variables tab → row `flags` → **Edit** → replace the value with `x`
   → **Save**. `x` is no flag `matches` knows.
4. Jobs tab → row menu of the failed job → **Retry** → **Retry**. The dialog stays open, and a
   red box shows the engine's reason alone: *incident cannot be resolved as things stand: failed
   to rebuild the variables of job …: failed to evaluate the input mappings of SERVICE_TASK
   ChargeFee: … correct the variables they read and resolve the incident again*. It says nothing
   about the retries of the task definition, and **Resolve the incident only** is still
   selected: new retries are no way out of an input mapping which fails.
5. Try them all the same: choose **Resolve the incident with new retries** and click **Retry**.
   The same reason shows again. The job is still *Failed*. Click **Cancel**.
6. Incidents tab → **Resolve** on the incident. A red message *The incident was not resolved:
   incident cannot be resolved as things stand: …* shows the same reason and stays until you
   close it. It gives no advice about retries of your own. The incident stays *Unresolved*.
7. Correct the variable: Variables tab → row `flags` → **Edit** → `i` → **Save**. Jobs tab → row
   menu of the failed job → **Retry** → **Retry**. A message *Job handed back to its workers*
   appears, and the job is *Active* again with 1 retry. There is no second
   `listener-demo-fee-before`.

## 3. Part T: in a terminal

These five scenarios need requests the UI does not send. Open a bash terminal in the zenbpm-ui
checkout and run this one line, exactly as it stands:

```bash
source manual-test/execution-listeners/engine.sh
```

You should see three lines like these:

```
engine:    http://localhost:8080
instances: U2 U3 U4 U5 U6 U7 U8 U9 U10 U11 U12 U13 U15 U17 U18 T1 T2 T3 ORDER_DEFINITION
           read from /home/you/zenbpm-ui/manual-test/execution-listeners/seeded-instances.md
```

There is nothing to copy: sourcing `engine.sh` reads the keys of the seeded instances from
`seeded-instances.md` into shell variables of the scenarios' names, such as `$T1`. Source it
again after every seeding run. If the second line says `instances: none yet`, run the seeding
script of 1.2 first.

It also defines one command, `zl`, which sends plain REST requests with `curl` and prints each
request with the status the engine answered:

| Command | What it does |
|---|---|
| `zl jobs $T1` | the jobs of the instance as a table, oldest first; `-` under `listenerEventType` means the job carries no such field |
| `zl job $T1 <type>` | the newest job of that type, as the engine answers it |
| `zl complete $T1 <type> ['<variables>']` | `POST /v1/jobs/{key}/complete` for that job |
| `zl fail $T1 <type> ['<body>']` | `POST /v1/jobs/{key}/fail` for that job, with the body you give |
| `zl cancel $T1`, `zl state $T1` | cancel the instance; its state, variables and active elements |
| `zl deploy <file>` | deploy a BPMN file |
| `zl api <METHOD> <path> ['<json>']` | any other request below `/v1` |

### T1. What a job carries which the UI does not show

The instance `$T1` waits behind the first end listener of `ShipOrder`.

1. Run `zl jobs $T1`. You should see five jobs in the order the engine created them:

   ```
   type                   elementId      elementType   listenerEventType  state      retries
   listener-demo-started  OrderReceived  START_EVENT   end                completed  3
   listener-demo-reserve  ShipOrder      SERVICE_TASK  start              completed  1
   listener-demo-credit   ShipOrder      SERVICE_TASK  start              completed  1
   listener-demo-ship     ShipOrder      SERVICE_TASK  -                  completed  1
   listener-demo-notify   ShipOrder      SERVICE_TASK  end                active     2
   ```

   A listener's job carries the element type of its element, and `listenerEventType` tells it
   from the element's own job.
2. Run `zl job $T1 listener-demo-reserve`, then `zl job $T1 listener-demo-ship`, then
   `zl job $T1 listener-demo-notify`. You should see in all three the same `elementInstanceKey`,
   and `"carrier": "post"` under `taskHeaders`: a listener's job carries the headers of its task.
   The first has `"listenerEventType": "start"`, the last `"listenerEventType": "end"`, and the
   task's own job has no `listenerEventType` field at all.

### T2. A listener's job takes no BPMN error, and a repeated completion changes nothing

The instance `$T2` waits behind the first start listener of the task, `listener-demo-reserve`.
The UI offers no error code for a listener's job (U5); the engine has to refuse one all the same.

1. Run `zl fail $T2 listener-demo-reserve '{"errorCode": "SHIPPING_FAILED"}'`. You should see
   `-> 400` and a message ending

   ```
   is the job of an execution listener, and a listener job cannot throw a BPMN error: fail it without an error code
   ```

   although the task has a boundary event for that very error code.
2. Run `zl jobs $T2`. You should see `listener-demo-reserve` still `active` with 1 retry: the
   refused request changed nothing.
3. Run `zl complete $T2 listener-demo-reserve '{"reserved": true}'`. You should see `-> 201`.
   Run it once more with other variables:
   `zl complete $T2 listener-demo-reserve '{"reserved": false}'`. You should see `-> 201` again.
4. Run `zl jobs $T2`. You should see three jobs, and exactly one `listener-demo-credit`: the
   repeated completion did not move the element on a second time.
5. Run `zl job $T2 listener-demo-credit`. You should see `"reserved": true` among its
   `inputVariables`: the variables of the repeated completion were dropped.

### T3. A completion after a cancel is refused

The instance `$T3` waits behind the first end listener, `listener-demo-notify`. The UI offers no
**Complete** for a terminated job (U10); a worker which is late may still send one.

1. Run `zl cancel $T3`. You should see `-> 204`.
2. Run `zl complete $T3 listener-demo-notify`. You should see `-> 409` and a message ending
   `is already terminated`.
3. Run `zl jobs $T3`. You should see `listener-demo-notify` `terminated`, and no
   `listener-demo-archive`.

### T4. A token started at an element runs the element's start listeners

No seeded instance; this one starts from the definition.

1. Start an instance with its token at the task:

   ```bash
   zl api POST /modify/start-process-instance '{"processDefinitionKey": '$ORDER_DEFINITION', "startingElementIds": ["ShipOrder"], "variables": {"orderId": "ORD-T4"}}'
   zl jobs $(zl newest listener-demo-order)
   ```

   You should see `-> 201`, and then one job, `listener-demo-reserve` with `start`: the task's
   start listeners run for a token which enters the task this way too. There is no
   `listener-demo-started`: the token never passed the start event, so its listener did not run.
2. Start another one with its token at the start event:

   ```bash
   zl api POST /modify/start-process-instance '{"processDefinitionKey": '$ORDER_DEFINITION', "startingElementIds": ["OrderReceived"], "variables": {"orderId": "ORD-T4b"}}'
   zl jobs $(zl newest listener-demo-order)
   ```

   You should see one job, `listener-demo-started` on `OrderReceived` with `end`.

### T5. All thirteen refused models at once

1. Run

   ```bash
   for model in $ZL_HOME/models/refused/*.bpmn; do zl deploy $model; done
   ```

   You should see `-> 400` thirteen times, each with the message of the table in U16.

## 4. Mocks (no engine)

`pnpm dev` (mocks mode) has two processes with listeners.

*Start Listener*: an instance waiting behind the listener of its start event
(`3100000000000000310`) and one with that listener's job failed and an incident
(`3100000000000000311`). U2 steps 1 to 3, U5 and U6 can be followed there.

*Task Listeners*, a service task with two start and two end listeners, then a user task with a
start listener:

| Instance | Where it waits |
|---|---|
| `3100000000000000312` | behind the second start listener of the service task |
| `3100000000000000313` | behind the first end listener (U4) |
| `3100000000000000314` | the first end listener failed, with an incident naming the job (U7) |
| `3100000000000000315` | behind the start listener of the user task (U11 step 1) |
| `3100000000000000316` | behind the user task's own job, which opens its form (U11 step 2) |

The mocks do not move the token on when a job is completed. They refuse a listener job's failure
with an error code with `400`, as the engine does.

The refusal of U18 has a mock scenario too. Run `VITE_E2E_TEST=true pnpm dev` (the scenario
parameter is ignored without that variable) and open
`http://localhost:3000/process-instances/3100000000000000038?jobRetriesScenario=inputMappingsDoNotEvaluate`,
then row menu of the failed job → **Retry** → **Retry**: the red box shows the engine's reason
alone, and **Resolve the incident only** stays selected. With
`jobRetriesScenario=jobChangedWhileResolving` the engine refuses because another request changed
the job meanwhile, which no hand is fast enough for: *… resolve it again*, and again nothing
about retries.

## 5. Not covered by hand

These need more than a terminal and a browser; the engine's tests hold them (`pkg/bpmn` unless a
path says otherwise).

| What | Test |
|---|---|
| A listener's job reaches a worker over the gRPC job stream with `listener_event_type` | `TestTheListenersOfATaskReachWorkersOverTheJobStream`, `TestStartListenerJobsReachWorkersOverTheJobStream` (`test/e2e`) |
| A timer start event waits behind its listener | `TestTimerStartEventWaitsBehindItsListener` |
| A task handler registered in the engine does the task's work between the listeners and takes no listener's job | `TestAnEngineHandlerDoesTheWorkOfATaskBetweenItsListeners` |
| A definition stored by an earlier version: its listeners run where the engine runs them now, and one a deployment would refuse raises an incident | `TestAStoredTaskListenerADeploymentWouldRefuseRaisesAnIncidentOnTheTask`, `TestAStoredListenerWhereTheEngineRunsNoneStaysIgnored`, `TestAJobCreatedBeforeItsTaskRanListenersCompletesAsBefore` |
| Completions of one listener's job which arrive together move the element on once | `TestConcurrentCompletionsOfAListenersJobMoveItsElementOnOnce` |
| An interrupting event sub-process terminates the waiting listener job | `TestInterruptingEventSubProcessTerminatesTheWaitingStartListenerJob` |
| The job columns `kind` and `listener_event_type`, and the table `element_scope` | `TestAJobKeepsWhatItBelongsTo`, `TestElementScopeRoundTrips` (`pkg/storage/storagetest`) |
| A row of `element_scope` is refused for a process instance which is not stored (foreign key) | `TestAnElementScopeIsRefusedForAProcessInstanceWhichIsNotStored` (`internal/cluster/partition`) |
| The row an element keeps in `element_scope` is deleted when its token leaves, and when it is taken out of the element: by an interrupting boundary event, a BPMN error (U9), a cancellation (U10) or a modification | `TestTheScopeOfATaskEndsWhenItsTokenIsTakenOutOfTheTask`, `TestCancellingAnInstanceTerminatesTheJobOfWhicheverPhaseItsTaskIsIn`, `TestABpmnErrorOfTheTasksJobLeavesByTheBoundaryEventAndOfAListenersJobIsRefused` |
| An element with listeners counts as one flow node towards `maxProcessInstanceFlowNodeCount`, as one without (the limit is 10000 by default, too many to reach by hand) | `TestTheListenersOfATaskDoNotSpendTheFlowNodeBudgetOfItsInstance` |
| An element without listeners takes the same way through the engine as one with them, and nothing is read or stored for it in `element_scope` | `TestAnElementWithoutListenersRunsTheSameLifecycleWithoutAScopeInTheStorage` |
| The incident of a listener's job, not of the task's own job as in U18, is refused with `409` while the input mappings of its task do not evaluate | `TestResolvingAnIncidentOfAListenersJobIsRefusedWhileTheInputMappingsOfItsTaskDoNotEvaluate` |
| A storage failure right after a listener's completion was committed fails the completion call | `TestAScopeWhichCannotBeReadAfterAListenersCompletionIsCommittedFailsTheCompletion` |
| **View related jobs** asks the engine for no jobs where the model says that all jobs of the element are in view, and otherwise reads a hundred jobs with a request, whatever the table shows to a page (the UI's mocked suite counts the requests) | `asks for no Jobs page for a task without listeners whose job is in view`, `looks for the job of a task without listeners a hundred jobs at a time, whatever the table shows to a page` (`e2e/pages/process-instances/detail.spec.ts`), `asks for no jobs where the model says that all jobs of the element are in view`, `looks through the jobs of an element a hundred at a time, whatever the table shows to a page` (`e2e/pages/process-instances/listener-jobs.spec.ts`) |
| **View related jobs** from a page of the Jobs tab whose rows arrive only after the search began: the table stays on that page where it holds a job of the element (again an engine slower than a hand) | `stays on the Jobs page selected where it holds a job of the element, though its rows arrive after the search began` (`e2e/pages/process-instances/listener-jobs.spec.ts`) |
| A request for a page of jobs which the engine fails to answer: an ended instance is asked once more, and a refresh never puts the rows of another page under the page selected | `asks once more for the jobs of an ended instance whose first request failed`, `keeps the rows of the Jobs page selected when a refresh fails to bring them itself` (`e2e/pages/process-instances/detail.spec.ts`) |
| An address which names a job beside an element instance which is not its own, or a job the instance does not have | `finds a job the address names beside an element instance which is not its own`, `says that no related job was found for a job the address names which the instance does not have` (`e2e/pages/process-instances/detail.spec.ts`) |
| **View related jobs** while a page of the Jobs tab is still on its way from the engine: the rows of the page shown before settle nothing, the job is looked for (it takes an engine slower than a hand) | `takes no row of the Jobs page shown before for the job in view, while the page selected is on its way` (`e2e/pages/process-instances/detail.spec.ts`) |
| The search for the jobs of an element ends when the Jobs page is turned, and when the browser goes back to the element's row in the history, before it has an answer (again an engine slower than a hand) | `says nothing about other pages once the page is turned while they are looked through`, `ends the search for the jobs of an element once the browser goes back to its row in the history` (`e2e/pages/process-instances/listener-jobs.spec.ts`) |
| The Jobs tab shows the rows of the page selected when the engine answers out of order: an answer for a page left before arrives last, or a refresh which began on the page before ends after the page was turned (again an engine slower than a hand) | `keeps the rows of the Jobs page selected when the answer for a page left before arrives late`, `shows the Jobs page selected after a refresh which had begun on the page before` (`e2e/pages/process-instances/detail.spec.ts`) |
| A cluster running both versions | not tested by a machine either; see *Upgrading a cluster* in `docs/reference/bpmn/execution-listeners.md` of the engine |
