# Execution listeners in the UI: manual test guide

This guide walks through the zenbpm-ui support for the engine's execution listeners: the
**Execution listeners** group of the designer's properties panel, and the Jobs tab, its Complete,
Fail and Retry dialogs, the History tab and the Incidents tab for the job of a listener.

What the engine does, in short:

- It runs `start` and `end` listeners on every element whose own work is one job: a service task,
  a send task, a user task, a business rule task done by a job worker, and a message intermediate
  throw event. None of them where the activity is multi-instance.
- It runs `end` listeners on a start event directly under `<process>`.
- It refuses a listener anywhere else at deployment, and ignores one on the process itself.
- Each listener is a job of its own. The jobs of one element follow each other, one at a time:
  its start listeners in the order of the model, the element's own job, its end listeners. The
  token leaves the element when the last of them is completed.
- All of these jobs carry the id, the type (`elementType`) and the element instance key of their
  element. Only `listenerEventType` (`start` or `end`) tells a listener's job from the element's
  own, which has none.
- What a `start` listener's job is completed with stays local to the element: the later start
  listeners and the element's own job see it, and it reaches the instance only where an output
  mapping of the element names it. What an `end` listener's job is completed with reaches only
  the later end listeners of the element.
- A listener job cannot throw a BPMN error.

## 1. How to run this test

1. **Engine.** Start a zenbpm built from branch `feature/e13.6-execution-listeners` on `:8080`,
   for example `make run` in the zenbpm checkout. An engine which runs listeners on start events
   only refuses the process of this guide, and the seeding script stops with a message saying so.
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
   pnpm install --force   # --force, because a rebuilt tarball keeps its file name
   rm -rf node_modules/.vite
   ```

   Only scenario L1 needs the panel; L2 to L9 work with the released one too.
4. **UI.** `pnpm dev:live` (http://localhost:3000, proxies `/v1` to `localhost:8080`).
5. **Seed.** With the engine running, and Python 3.9 or newer (standard library only):

   ```bash
   python3 manual-test/execution-listeners/seed_execution_listener_scenarios.py
   # options: --engine http://localhost:8080  --ui http://localhost:3000
   ```

   Every run deploys the process `listener-demo-order` once and starts seven fresh instances. It
   prints a link for each and writes the same table to `seeded-instances.md` next to the script,
   which git ignores. Seed again for fresh instances whenever a scenario has used one up.

   | Element | Jobs, in the order the engine runs them |
   |---|---|
   | *Order received* (start event) | end listener `listener-demo-started`, retries 3 |
   | *Ship order* (service task) | start listeners `listener-demo-reserve` and `listener-demo-credit`, the task's own job `listener-demo-ship`, end listeners `listener-demo-notify` (retries 2) and `listener-demo-archive` |
   | *Confirm delivery* (user task) | start listener `listener-demo-prepare`, the task's own job `listener-demo-confirm` |

   *Ship order* has an output mapping from `reserved` to the instance variable `stockReserved`.

## 2. Scenarios

### L1. Designer: the Execution listeners group

No seeded data. Open **Designer → New process**, append a task to the start event and an end
event to the task, and change the task to a **Service task**.

**Where the group is offered**

1. Select the service task. The properties panel shows the group **Execution listeners**, empty,
   with a **Create** button. The start event shows it too.
2. Select the end event: no such group. The same holds for a gateway, a sub-process, a call
   activity, a receive task, a script task, and a start event inside a sub-process.
3. Change the task to a **Send task**, then a **User task**: the group stays. Change it to a
   **Business rule task**: the group is gone while **Implementation** is *DMN decision*, and comes
   back with *Job worker*. Change it back to a **Service task**.

**A chain on a task**

4. On the service task click **Create**. A listener appears, open, with **Event type** *Start*,
   an empty **Type** flagged *Enter the job type of the listener*, and **Retries**. The Type's
   description says a worker completes the job *before the element's own work starts*. The list
   item is labelled `Start: <no type>`.
5. Enter `reserve-stock` in Type and `3` in Retries. The item is labelled `Start: reserve-stock`.
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
   show *Enter another job type: two listeners of one event type need different types*. Deploy:
   the deployment fails with *… has two execution listeners with eventType="start" and
   type="reserve-stock": the listeners of one event type need different types*. Set the third
   one to *End*: both errors go away, since the type differs from the other end listener's.
   Delete the third listener with the delete button of its list item.
10. Enter `=jobType` in a Type: *Enter the job type as a literal: a listener takes no FEEL
    expression*. Enter `-1`, `1.5` and `2147483648` in Retries, one after another: each shows
    *Enter a whole number from 0 to 2147483647*. Restore the values.
11. Clear a Type. The listener stays with its Retries, and Type is flagged again. Restore it.
12. Give the task the **Parallel multi-instance** marker (in the task's **Change element** menu,
    the wrench). The group loses
    **Create**, and each listener's Event type says *Remove this listener or the multi-instance
    marker: the engine runs no listener on a multi-instance activity*. Deploy: the engine answers
    *execution listener eventType="start" on service task id="…" is not supported: execution
    listeners run on a service, send or user task, …, none of them multi-instance …*. Remove the
    marker again.
13. Delete the sequence flow behind the task and select the task again. Each Event type says
    *Connect an outgoing sequence flow: the token could not leave the element once the
    listener's job is completed*. Draw the flow again; the error is gone when the task is
    selected next.

**A start event**

14. Select the start event and click **Create**. The listener's Event type is *End*, and *End* is
    the only option: a start event takes end listeners only. Give it the Type `order-started`.
    **Create** stays, so a start event can carry several end listeners.
15. In the XML view, change that listener to `eventType="start"`, switch back and select the
    start event. The Event type reads *Start* and says *Choose End: a start event takes only end
    listeners*. Deploy: *execution listener eventType="start" on start event id="…" is not
    supported: a start event takes listeners with eventType="end"*. Choose *End*.
16. Add an expanded sub-process, drag the start event with its listener into it and select it.
    The group is still shown, without **Create**; Event type says *Remove this listener: the
    engine runs a listener on a start event only directly under the process*. Delete the
    listener, and the group disappears. Undo (Ctrl+Z) both steps.

### L2. A start event's listener waits, and completing it moves the token on

Open the L2 link.

1. The diagram and the History tab show *Order received* active; nothing behind it has run.
2. The Jobs tab lists one job, type `listener-demo-started`, with an **End listener** chip below
   the element. Hovering the chip explains that the token leaves the element once the jobs of all
   its end listeners are completed.
3. Click **Complete**. A note above the variables editor says that the variables of an end
   listener reach only the later end listeners of the element and never the instance, and that
   the instance's variables are changed on the Variables tab. Close the dialog.
4. Open the History tab. The row of *Order received* has a row menu (⋮) with **View related
   jobs**, which leads back to the listener job on the Jobs tab. Click **Complete** again.
5. Complete it. After the refresh the listener job is *Completed*, *Order received* is
   completed, and a job `listener-demo-reserve` waits at *Ship order* with a **Start listener**
   chip.

### L3. Failing a listener job offers no error code

Open the L3 link, then the row menu (⋮) of the listener job → **Fail job**.

1. There is no **Error Code** field. A note says that a listener cannot throw a BPMN error, so
   the failure spends one attempt.
2. The outcome says the failure leaves 2 retries. The **Backoff** field's help says it overrides
   *the listener's backoff*. Enter a message and fail the job.
3. The row shows *1 failed* under the retries; **Failure history** lists the failure with its
   message.

### L4. An incident on the start event, resolved by Retry

Open the L4 link.

1. The instance still reads active, waiting at *Order received*. The listener job is *Failed*
   with 0 retries and *3 failed*.
2. The Incidents tab shows an incident on *Order received*, with the last failure's message.
   Following it to the job lands on the listener job.
3. Row menu of the listener job → **Retry**. The hint says that resolving the incident restores
   *the retries of the listener*. Click **Retry**. The job is *Active* again with the listener's
   3 retries, and the incident is resolved.

### L5. The chain of a task, one job at a time

Open the L5 link. *Order received* is completed, and *Ship order* is active.

1. The Jobs tab shows one job of *Ship order*: `listener-demo-reserve` with a **Start listener**
   chip. The task's own job `listener-demo-ship` does not exist yet. Hovering the chip explains
   that the element's own work begins once the jobs of all its start listeners are completed.
2. Click **Complete**. The note says the variables stay local to the element. Enter
   `{"reserved": true}` and complete.
3. After the refresh `listener-demo-credit` waits, again a start listener. Click the **In** badge
   in its *Job input/output* column: its input variables contain `reserved`. The Variables tab of
   the instance does **not** show `reserved`: no output mapping has run yet.
4. Complete `listener-demo-credit` without variables. Now `listener-demo-ship` waits, **without
   a chip**: it is the task's own job. Its **Complete** dialog shows the variables editor
   without a note, and its **Fail job** dialog has the **Error Code** field and names *the task
   definition's backoff*.
5. Complete `listener-demo-ship`. The Variables tab now shows `stockReserved: true`: the output
   mapping of the task wrote the start listener's `reserved` to the instance. The History row of
   *Ship order* is still active, and shows the task's outputs.
6. `listener-demo-notify` waits with an **End listener** chip. Complete it with
   `{"notified": "by-mail"}`. Then `listener-demo-archive` waits; its **In** badge shows
   `notified` among its input variables. The Variables tab does not.
7. Complete `listener-demo-archive`. *Ship order* is completed in the History, and
   `listener-demo-prepare` waits at *Confirm delivery*. The Jobs tab lists the five jobs of
   *Ship order*, all with the same element.

### L6. Several jobs of one element

Open the L6 link. *Ship order* waits behind its first end listener, `listener-demo-notify`; its
two start listeners and its own job are completed.

1. The Jobs tab shows four jobs on *Ship order*: two with a **Start listener** chip, one without
   a chip, one with an **End listener** chip.
2. History tab → row of *Ship order* → row menu → **View related jobs**. The Jobs tab opens with
   all four jobs of *Ship order* highlighted, and not the job of *Order received*.
3. Row menu of any of the four → **View in history** highlights the one row of *Ship order*.

### L7. An incident of a task's listener leads to exactly its job

Open the L7 link. `listener-demo-notify` spent its 2 retries.

1. The instance reads active. The Jobs tab shows `listener-demo-notify` *Failed* with 0 retries
   and *2 failed*; the three jobs before it are completed.
2. The Incidents tab shows one incident on *Ship order*, whose **Job** column names the key of
   `listener-demo-notify`. Click it. The Jobs tab opens with **only that job** highlighted,
   although all four jobs belong to the same element; the address bar carries
   `focusElementInstanceKey` and `focusJobKey`.
3. Row menu of the failed job → **Retry**. The hint names *the retries of the listener*. Click
   **Retry**. The job is *Active* again with 2 retries, the listener's and not the one retry of
   the task's own job, and the incident is resolved. No completed job of the task is active
   again: the engine runs no completed listener a second time.

### L8. A user task: Assign belongs to the task's own job

Open the L8 link. *Confirm delivery* waits behind its start listener.

1. The Jobs tab shows `listener-demo-prepare` on *Confirm delivery* with a **Start listener**
   chip. The user task has no job of its own yet. The row menu of the listener job offers
   **Update Retries** and **Fail job**, and **no Assign**.
2. Complete the listener job. `listener-demo-confirm` appears, without a chip. Its row menu
   offers **Assign**; assign it to somebody. The listener's row still offers none.

### L9. Mocks (no engine)

`pnpm dev` (mocks mode) has two processes with listeners.

*Start Listener*: an instance waiting behind the listener of its start event
(`3100000000000000310`) and one with that listener's job failed and an incident
(`3100000000000000311`). L2 steps 1 to 3, L3 and L4 can be followed there.

*Task Listeners*, a service task with two start and two end listeners, then a user task with a
start listener:

| Instance | Where it waits |
|---|---|
| `3100000000000000312` | behind the second start listener of the service task |
| `3100000000000000313` | behind the first end listener (L6) |
| `3100000000000000314` | the first end listener failed, with an incident naming the job (L7) |
| `3100000000000000315` | behind the start listener of the user task (L8 step 1) |
| `3100000000000000316` | behind the user task's own job, which opens its form (L8 step 2) |

The mocks do not move the token on when a job is completed. They refuse a listener job's failure
with an error code with `400`, as the engine does.
