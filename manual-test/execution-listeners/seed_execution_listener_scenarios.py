#!/usr/bin/env python3
"""Seed a running zenbpm engine with the data for testing its execution listeners by hand, engine and UI.

It works on an empty database: it deploys the seven processes of `models/` and starts fresh
instances on every run, each driven to its scenario through the engine's public REST API only.
A redeployment of an unchanged model answers with the existing definition.

The processes:

  listener-demo-order             Order received    start event    end listener `listener-demo-started` (retries 3)
                                  Ship order        service task   start listeners `listener-demo-reserve`, `listener-demo-credit`,
                                                                   the task's own job `listener-demo-ship`,
                                                                   end listeners `listener-demo-notify` (retries 2), `listener-demo-archive`;
                                                                   a header `carrier`, an input mapping `orderId` -> `shipmentOf`,
                                                                   an output mapping `reserved` -> `stockReserved`,
                                                                   an error boundary event for `SHIPPING_FAILED`
                                  Confirm delivery  user task      start listener `listener-demo-prepare`, own job `listener-demo-confirm`
  listener-demo-elements          a send task, a business rule task done by a job worker and a message throw event,
                                  each with a start and an end listener
  listener-demo-parcel            a service task with listeners inside a sub-process whose output mapping
                                  writes `labelled` as `parcelLabelled`, then a call activity
  listener-demo-payment           the called process: an end listener on its start event, a start listener on its task
  listener-demo-order-placed      a message start event with two end listeners and an output mapping
  listener-demo-process-listener  a listener on the process element, which the engine deploys and never runs
  listener-demo-fee               a service task with a start listener and an input mapping which fails
                                  once the variable `flags` holds a flag FEEL's matches() does not know

The scenarios, U for the part of the guide done in the UI and T for the part done in a terminal:

  U2   order, behind the start event's listener         (complete it)
  U3   order, behind the task's first start listener    (walk the chain, follow the variables)
  U4   order, behind the task's first end listener      (four jobs of one element: chips, links)
  U5   order, behind the start event's listener         (fail it: no error code)
  U6   order, the start event's listener out of retries (an incident stands on the start event)
  U7   order, the task's end listener out of retries    (an incident stands on the task, and names the job)
  U8   order, behind the task's second start listener   (fail it, correct a variable, retry)
  U9   order, behind the task's own job                 (a BPMN error leaves by the boundary event)
  U10  order, behind the task's first end listener      (cancel the instance)
  U11  order, behind the user task's start listener     (Assign is offered for the task's own job only)
  U12  elements, behind its first job                   (send task, business rule task, message throw event)
  U13  parcel, in its sub-process                       (sub-process and called process)
  U15  process-listener, behind its only job            (the listener on the process created no job)
  U17  order, behind the task's second start listener   (restart the engine)
  U18  fee, behind the task's start listener            (a resolution refused while the input mapping fails)
  T1   order, behind the task's first end listener      (what a job carries which the UI does not show)
  T2   order, behind the task's first start listener    (error code refused, completion repeated)
  T3   order, behind the task's first end listener      (a completion after a cancel)

U1, U14, U16, T4 and T5 start from the definitions alone. Before it seeds, the script checks on an
instance of its own, which it cancels again, that the engine writes what an end listener's job is
completed with to the instance: the guide expects that. The script writes `seeded-instances.md`
next to itself, with a UI link for every instance and the keys which `engine.sh` reads when it is
sourced, and prints the same. The guide is EXECUTION_LISTENERS_MANUAL_TEST.md in the same directory.

Usage:
    python3 seed_execution_listener_scenarios.py [--engine http://localhost:8080] [--ui http://localhost:3000]
"""

import argparse
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
MODELS = HERE / "models"
ENGINE = "http://localhost:8080"
ENGINE_NEEDED = ("It needs the execution listeners of zenbpm branch feature/e13.6-execution-listeners, "
                 "which runs them on tasks as well as on start events.")
ENGINE_TOO_OLD = ("The engine dropped what the job of an end listener was completed with, where the guide expects it "
                  "in the instance. Build the engine again from the head of zenbpm branch "
                  "feature/e13.6-execution-listeners and start that build.")

ORDER = "listener-demo-order"
ELEMENTS = "listener-demo-elements"
PARCEL = "listener-demo-parcel"
PAYMENT = "listener-demo-payment"
ORDER_PLACED = "listener-demo-order-placed"
PROCESS_LISTENER = "listener-demo-process-listener"
FEE = "listener-demo-fee"
# The called process comes before its caller.
PROCESSES = [ORDER, ELEMENTS, PAYMENT, PARCEL, ORDER_PLACED, PROCESS_LISTENER, FEE]

STARTED = "listener-demo-started"
RESERVE = "listener-demo-reserve"
CREDIT = "listener-demo-credit"
SHIP = "listener-demo-ship"
NOTIFY = "listener-demo-notify"
ARCHIVE = "listener-demo-archive"
PREPARE = "listener-demo-prepare"
CONFIRM = "listener-demo-confirm"

# Every job of the order process in the order the engine creates it: (job type, element, listener event type).
# The event type is None for an element's own job.
CHAIN = [
    (STARTED, "OrderReceived", "end"),
    (RESERVE, "ShipOrder", "start"),
    (CREDIT, "ShipOrder", "start"),
    (SHIP, "ShipOrder", None),
    (NOTIFY, "ShipOrder", "end"),
    (ARCHIVE, "ShipOrder", "end"),
    (PREPARE, "ConfirmDelivery", "start"),
    (CONFIRM, "ConfirmDelivery", None),
]

# What the script completes a job with on its way to a scenario. The start listener's `reserved`
# reaches the instance as `stockReserved` through the output mapping of the task. The end listeners
# are completed without variables, so that what they write to the instance is the tester's doing.
COMPLETION_VARIABLES = {
    RESERVE: {"reserved": True},
    SHIP: {"trackingId": "TRK-1"},
}


def call(method, path, body=None, raw=None, expect=(200, 201, 204)):
    headers = {}
    data = None
    if raw is not None:
        data = raw
        headers["Content-Type"] = "application/octet-stream"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(f"{ENGINE}/v1{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            text, status = response.read().decode(), response.status
    except urllib.error.HTTPError as error:
        text, status = error.read().decode(), error.code
    except urllib.error.URLError as error:
        sys.exit(f"The engine at {ENGINE} does not answer ({error.reason}). Start it first, or pass --engine.")
    if status not in expect:
        raise RuntimeError(f"{method} {path} answered {status}: {text}")
    # Python's json keeps int64 keys exact, as its integers have no fixed width.
    return json.loads(text) if text.strip() else None


def deploy(process_id):
    model = MODELS / f"{process_id}.bpmn"
    if not model.is_file():
        sys.exit(f"The model {model} is missing: the script deploys the processes of the directory models/ beside it.")
    # an engine started a moment ago answers before its partition is ready
    deadline = time.time() + 30
    while True:
        try:
            return call("POST", "/process-definitions", raw=model.read_bytes())["processDefinitionKey"]
        except RuntimeError as error:
            if "listener" in str(error) and "CLUSTER_ERROR" not in str(error):
                sys.exit(f"The engine refused {model.name}: {error}\n{ENGINE_NEEDED}")
            if "CLUSTER_ERROR" not in str(error) or time.time() > deadline:
                raise
            time.sleep(0.5)


def start(definition_key, variables):
    return call("POST", "/process-instances", {"processDefinitionKey": definition_key, "variables": variables})["key"]


def jobs_of(instance_key):
    return call("GET", f"/process-instances/{instance_key}/jobs?page=1&size=100").get("items", [])


def job_of(instance_key, job_type, states=("active",), timeout=15):
    """Waits for the job of the type in the order instance and checks that it is what the model says.

    The jobs of one element share its id, so the element alone does not name a job: a
    listener's job is told from the element's own by its listener event type.
    """
    element_id, listener_event_type = next((element, event) for type_, element, event in CHAIN if type_ == job_type)
    deadline = time.time() + timeout
    while time.time() < deadline:
        for job in jobs_of(instance_key):
            if job["type"] == job_type and job["state"] in states:
                if job["elementId"] != element_id or job.get("listenerEventType") != listener_event_type:
                    sys.exit(f"The engine created the job {job_type} on {job['elementId']} with "
                             f"listenerEventType={job.get('listenerEventType')}, where {element_id} with "
                             f"{listener_event_type} was expected. {ENGINE_NEEDED}")
                return job
        time.sleep(0.2)
    raise RuntimeError(f"timed out waiting for the job {job_type} in instance {instance_key} in {states}. "
                       f"If another job of {element_id} waits instead, the engine runs no listener there. "
                       f"{ENGINE_NEEDED}")


def advance_to(instance_key, job_type):
    """Completes the jobs of the order chain before the one of the type, and answers that job, which then waits."""
    for type_, _, _ in CHAIN:
        job = job_of(instance_key, type_)
        if type_ == job_type:
            return job
        call("POST", f"/jobs/{job['key']}/complete", {"variables": COMPLETION_VARIABLES.get(type_, {})})
    raise ValueError(f"no job of type {job_type} in the chain")


def spend_retries(instance_key, job_type, retries):
    """Fails the waiting job of the type until no retry is left, which raises its incident."""
    job = job_of(instance_key, job_type)
    for attempt in range(1, retries + 1):
        # no backoff, so that the next failure finds the job active at once
        call("POST", f"/jobs/{job['key']}/fail",
             {"message": f"service unavailable (attempt {attempt})", "retryBackoff": "PT0S"})
        job = job_of(instance_key, job_type, ("active", "failed"))
    return job_of(instance_key, job_type, ("failed",))


def wait_for_a_job(instance_key, job_type, timeout=15):
    """Waits until the instance, or an instance its sub-process or call activity started, has the job."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        children = call("GET", f"/process-instances/{instance_key}/child-processes?page=1&size=100")
        keys = [instance_key] + [child["key"] for partition in children.get("partitions", [])
                                 for child in partition.get("items", [])]
        if any(job["type"] == job_type and job["state"] == "active" for key in keys for job in jobs_of(key)):
            return
        time.sleep(0.2)
    raise RuntimeError(f"timed out waiting for the job {job_type} of instance {instance_key}. {ENGINE_NEEDED}")


def check_end_listener_variables_reach_the_instance(order_definition):
    """Stops the script on an engine which drops what an end listener's job is completed with."""
    instance_key = start(order_definition, {"orderId": "ORD-engine-check"})
    job = job_of(instance_key, STARTED)
    call("POST", f"/jobs/{job['key']}/complete", {"variables": {"writtenByTheEndListener": True}})
    job_of(instance_key, RESERVE)
    variables = call("GET", f"/process-instances/{instance_key}").get("variables") or {}
    call("POST", f"/process-instances/{instance_key}/cancel")
    if variables.get("writtenByTheEndListener") is not True:
        sys.exit(ENGINE_TOO_OLD)


def seed(ui):
    definitions = {process_id: deploy(process_id) for process_id in PROCESSES}
    check_end_listener_variables_reach_the_instance(definitions[ORDER])
    stamp = time.strftime("%H%M%S")
    seeded = []

    def order(name, title, prepare):
        instance_key = start(definitions[ORDER], {"orderId": f"ORD-{stamp}-{name}"})
        prepare(instance_key)
        seeded.append((name, title, instance_key, f"{ui}/process-instances/{instance_key}"))

    def other(name, title, process_id, variables, first_job):
        instance_key = start(definitions[process_id], variables)
        wait_for_a_job(instance_key, first_job)
        seeded.append((name, title, instance_key, f"{ui}/process-instances/{instance_key}"))

    order("U2", "a start event's listener waits: complete it",
          lambda instance: advance_to(instance, STARTED))
    order("U3", "the chain of a task: walk it and follow the variables",
          lambda instance: advance_to(instance, RESERVE))
    order("U4", "several jobs of one element: chips and links",
          lambda instance: advance_to(instance, NOTIFY))
    order("U5", "failing a listener's job: no error code",
          lambda instance: advance_to(instance, STARTED))
    order("U6", "an incident on the start event: retry",
          lambda instance: (advance_to(instance, STARTED), spend_retries(instance, STARTED, 3)))
    order("U7", "an incident of a task's listener: exactly its job",
          lambda instance: (advance_to(instance, NOTIFY), spend_retries(instance, NOTIFY, 2)))
    order("U8", "resolving an incident keeps what earlier listeners added",
          lambda instance: advance_to(instance, CREDIT))
    order("U9", "a BPMN error of the task's own job",
          lambda instance: advance_to(instance, SHIP))
    order("U10", "cancelling while a listener waits",
          lambda instance: advance_to(instance, NOTIFY))
    order("U11", "a user task: Assign belongs to the task's own job",
          lambda instance: advance_to(instance, PREPARE))
    other("U12", "a send task, a business rule task and a message throw event",
          ELEMENTS, {"customer": f"C-{stamp}"}, "listener-demo-invoice-before")
    other("U13", "a sub-process and a called process",
          PARCEL, {"parcel": f"P-{stamp}"}, "listener-demo-label-before")
    other("U15", "a listener on the process itself",
          PROCESS_LISTENER, {}, "listener-demo-audit")
    order("U17", "a restart of the engine",
          lambda instance: advance_to(instance, CREDIT))
    # `flags` is the third argument of matches() in the input mapping of the task: "i" is one it knows
    other("U18", "a resolution refused while the input mapping fails",
          FEE, {"orderId": f"ORD-{stamp}-U18", "pattern": "ORD", "flags": "i"}, "listener-demo-fee-before")
    order("T1", "terminal: what a job carries which the UI does not show",
          lambda instance: advance_to(instance, NOTIFY))
    order("T2", "terminal: an error code on a listener's job, a repeated completion",
          lambda instance: advance_to(instance, RESERVE))
    order("T3", "terminal: a completion after a cancel",
          lambda instance: advance_to(instance, NOTIFY))
    return definitions, seeded


def main():
    global ENGINE
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--engine", default=ENGINE)
    parser.add_argument("--ui", default="http://localhost:3000")
    args = parser.parse_args()
    ENGINE = args.engine.rstrip("/")
    ui = args.ui.rstrip("/")

    definitions, seeded = seed(ui)
    lines = [
        "# Seeded execution listener scenarios",
        "",
        f"Seeded at {time.strftime('%Y-%m-%d %H:%M:%S')} on {ENGINE}.",
        "",
        "## Links for the UI",
        "",
        "| Scenario | Instance | Link |",
        "|---|---|---|",
        *[f"| {name}: {title} | `{key}` | {link} |" for name, title, key, link in seeded],
        "",
        "| Process | Definition |",
        "|---|---|",
        *[f"| `{process_id}` | {ui}/process-definitions/{definitions[process_id]} |" for process_id in PROCESSES],
        "",
        "## For the terminal part",
        "",
        "Run this in a bash terminal, and again after every seeding run:",
        "",
        "```bash",
        f"source {HERE / 'engine.sh'}",
        "```",
        "",
        "It reads the engine and the instances of this run from the lines below, into shell variables",
        "of the same names. There is nothing to copy.",
        "",
        "```",
        f"ENGINE={ENGINE}",
        *[f"{name}={key}" for name, _, key, _ in seeded],
        f"ORDER_DEFINITION={definitions[ORDER]}",
        "```",
        "",
    ]
    (HERE / "seeded-instances.md").write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"Written to {HERE / 'seeded-instances.md'}")


if __name__ == "__main__":
    main()
