#!/usr/bin/env python3
"""Seed a running zenbpm engine with process instances for testing the job retry UI by hand.

Every scenario gets its own process (id prefix `retry-demo-`) and its own process instance(s),
driven to the state the scenario needs through the engine's public REST API only: deploy,
start, fail, set retries, resolve incident, complete, set variables. Nothing is written to the database
directly. The script can be run again at any time; every run adds fresh instances (the
definitions are deployed once, the engine answers a redeployment of the same XML with the
existing key) and rewrites, next to this file, `seeded-instances.md` and the manual test guide
`JOB_RETRY_MANUAL_TEST.md` (rendered from `JOB_RETRY_MANUAL_TEST.template.md`) with direct UI
links and the times of the seeded backoffs.

The script may be run from any directory. It needs the guide's template
`JOB_RETRY_MANUAL_TEST.template.md` next to itself (or in the current directory, or named with
`--template`); keep the two files together. Both output files are written next to the template
unless `--out-dir` says otherwise. Nothing is seeded before the template is found.

Usage:
    python3 seed_job_retry_scenarios.py [--engine http://localhost:8080] [--ui http://localhost:3000]
                                        [--template PATH] [--out-dir DIR]
"""

import argparse
import datetime
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
TEMPLATE_NAME = "JOB_RETRY_MANUAL_TEST.template.md"


def find_template(explicit):
    """The guide's template next to the script or in the current directory, or a clear error."""
    if explicit:
        candidates = [pathlib.Path(explicit).expanduser()]
    else:
        candidates = [HERE / TEMPLATE_NAME, pathlib.Path.cwd() / TEMPLATE_NAME]
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    looked_at = "\n  ".join(str(candidate) for candidate in candidates)
    sys.exit(f"The guide template {TEMPLATE_NAME} was not found. Looked at:\n  {looked_at}\n"
             "Keep it next to the script, or pass --template with its path.")

# ---------------------------------------------------------------------------
# REST helpers
# ---------------------------------------------------------------------------

ENGINE = "http://localhost:8080"


def call(method, path, body=None, raw=None, expect=(200, 201, 204)):
    url = f"{ENGINE}/v1{path}"
    headers = {}
    data = None
    if raw is not None:
        data = raw
        headers["Content-Type"] = "application/octet-stream"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            text = response.read().decode()
            status = response.status
    except urllib.error.HTTPError as error:
        text = error.read().decode()
        status = error.code
    if status not in expect:
        raise RuntimeError(f"{method} {path} answered {status}: {text}")
    return json.loads(text) if text.strip() else None


def wait_until_partition_serves():
    # An engine started a moment ago answers the jobs read with no partition at all, then with
    # CLUSTER_ERROR, and only then from its partition; until then a deployment answers 500.
    deadline = time.time() + 30
    while True:
        try:
            if call("GET", "/jobs?page=1&size=1")["partitions"]:
                return
        except RuntimeError as error:
            if "CLUSTER_ERROR" not in str(error):
                raise
        if time.time() > deadline:
            raise RuntimeError("no partition serves jobs after 30 s")
        time.sleep(0.5)


def deploy(xml):
    # an engine started a moment ago answers before its partition is ready
    deadline = time.time() + 30
    while True:
        try:
            result = call("POST", "/process-definitions", raw=xml.encode())
            return result["processDefinitionKey"]
        except RuntimeError as error:
            if "CLUSTER_ERROR" not in str(error) or time.time() > deadline:
                raise
            time.sleep(0.5)


def start(definition_key, variables):
    result = call("POST", "/process-instances", {"processDefinitionKey": definition_key, "variables": variables})
    return result["key"]


def wait_for(description, probe, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        value = probe()
        if value:
            return value
        time.sleep(0.2)
    raise RuntimeError(f"timed out waiting for {description}")


def job_of(instance_key, element_id, states=("active",)):
    def probe():
        page = call("GET", f"/process-instances/{instance_key}/jobs?page=1&size=100")
        for job in page.get("items", []):
            if job["elementId"] == element_id and job["state"] in states:
                return job
        return None

    return wait_for(f"job {element_id} of instance {instance_key} in {states}", probe)


def retry_at_of(instance_key, element_id, states=("active",)):
    """The `retryAt` of a job once a read shows it: job reads may lag behind the write on a cluster."""
    def probe():
        page = call("GET", f"/process-instances/{instance_key}/jobs?page=1&size=100")
        for job in page.get("items", []):
            if job["elementId"] == element_id and job["state"] in states and job.get("retryAt"):
                return job["retryAt"]
        return None

    return wait_for(f"retryAt of job {element_id} of instance {instance_key}", probe)


def open_incident_of(instance_key, job_key):
    def probe():
        page = call("GET", f"/process-instances/{instance_key}/incidents?state=unresolved&page=1&size=100")
        for incident in page.get("items", []):
            if incident.get("jobKey") == job_key:
                return incident
        return None

    return wait_for(f"open incident of job {job_key}", probe)


def any_open_incident(instance_key):
    def probe():
        page = call("GET", f"/process-instances/{instance_key}/incidents?state=unresolved&page=1&size=100")
        items = page.get("items", [])
        return items[0] if items else None

    return wait_for(f"open incident of instance {instance_key}", probe)


def fail(job_key, message, **extra):
    call("POST", f"/jobs/{job_key}/fail", {"message": message, **extra})


def fail_until_incident(instance_key, element_id, attempts, message_prefix):
    job = job_of(instance_key, element_id)
    for attempt in range(1, attempts + 1):
        fail(job["key"], f"{message_prefix} (seeded failure {attempt})")
    job = job_of(instance_key, element_id, states=("failed",))
    return job, open_incident_of(instance_key, job["key"])


def set_variables(instance_key, variables):
    call("PATCH", f"/process-instances/{instance_key}/variables", {"variables": variables})


def in_hours(hours):
    at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=hours)
    return at.isoformat(timespec="seconds").replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# BPMN builders (every model carries a diagram, so the UI can draw it)
# ---------------------------------------------------------------------------

HEADER = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
    'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
    'xmlns:zenbpm="http://zenbpm.pbinitiative.org/1.0" '
    'id="Definitions_{pid}" targetNamespace="http://bpmn.io/schema/bpmn" '
    'exporter="ZenBPM Modeler" exporterVersion="1.0.0">\n'
)


def task_definition(job_type, retries=None, backoff=None):
    attributes = f'type="{job_type}"'
    if retries is not None:
        attributes += f' retries="{retries}"'
    if backoff is not None:
        attributes += f' retryBackoff="{backoff}"'
    return f"<bpmn:extensionElements><zenbpm:taskDefinition {attributes} /></bpmn:extensionElements>"


def linear_process(pid, name, tasks):
    """start -> tasks -> end; a task is (element id, name, bpmn tag, task definition xml)."""
    ids = ["start"] + [task[0] for task in tasks] + ["end"]
    flows = [(f"flow_{i}", ids[i], ids[i + 1]) for i in range(len(ids) - 1)]
    body = [f'<bpmn:process id="{pid}" name="{name}" isExecutable="true">']
    body.append('<bpmn:startEvent id="start"><bpmn:outgoing>flow_0</bpmn:outgoing></bpmn:startEvent>')
    for index, (task_id, task_name, tag, definition) in enumerate(tasks):
        body.append(
            f'<bpmn:{tag} id="{task_id}" name="{task_name}">{definition}'
            f"<bpmn:incoming>flow_{index}</bpmn:incoming><bpmn:outgoing>flow_{index + 1}</bpmn:outgoing></bpmn:{tag}>"
        )
    body.append(f'<bpmn:endEvent id="end" name="Done"><bpmn:incoming>flow_{len(tasks)}</bpmn:incoming></bpmn:endEvent>')
    for flow_id, source, target in flows:
        body.append(f'<bpmn:sequenceFlow id="{flow_id}" sourceRef="{source}" targetRef="{target}" />')
    body.append("</bpmn:process>")

    shapes = []
    x = {}
    shapes.append('<bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="152" y="102" width="36" height="36" /></bpmndi:BPMNShape>')
    x["start"] = (152, 36)
    position = 240
    for task_id, *_ in tasks:
        shapes.append(f'<bpmndi:BPMNShape id="{task_id}_di" bpmnElement="{task_id}"><dc:Bounds x="{position}" y="80" width="100" height="80" /></bpmndi:BPMNShape>')
        x[task_id] = (position, 100)
        position += 160
    shapes.append(f'<bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="{position}" y="102" width="36" height="36" /></bpmndi:BPMNShape>')
    x["end"] = (position, 36)
    for flow_id, source, target in flows:
        source_x = x[source][0] + x[source][1]
        target_x = x[target][0]
        shapes.append(
            f'<bpmndi:BPMNEdge id="{flow_id}_di" bpmnElement="{flow_id}">'
            f'<di:waypoint x="{source_x}" y="120" /><di:waypoint x="{target_x}" y="120" /></bpmndi:BPMNEdge>'
        )
    diagram = f'<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{pid}">{"".join(shapes)}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>'
    return HEADER.format(pid=pid) + "\n".join(body) + "\n" + diagram + "\n</bpmn:definitions>\n"


def bpmn_error_process(pid):
    return HEADER.format(pid=pid) + f"""<bpmn:process id="{pid}" name="Retry demo: BPMN error" isExecutable="true">
<bpmn:startEvent id="start"><bpmn:outgoing>flow_start</bpmn:outgoing></bpmn:startEvent>
<bpmn:sequenceFlow id="flow_start" sourceRef="start" targetRef="charge-card" />
<bpmn:serviceTask id="charge-card" name="Charge card">{task_definition("demo-charge-card-bpmn-error", 3, "PT1M")}<bpmn:incoming>flow_start</bpmn:incoming><bpmn:outgoing>flow_done</bpmn:outgoing></bpmn:serviceTask>
<bpmn:sequenceFlow id="flow_done" sourceRef="charge-card" targetRef="end" />
<bpmn:endEvent id="end" name="Charged"><bpmn:incoming>flow_done</bpmn:incoming></bpmn:endEvent>
<bpmn:boundaryEvent id="payment-declined" name="PAYMENT_DECLINED" attachedToRef="charge-card"><bpmn:outgoing>flow_declined</bpmn:outgoing><bpmn:errorEventDefinition id="payment-declined-definition" errorRef="payment-declined-error" /></bpmn:boundaryEvent>
<bpmn:sequenceFlow id="flow_declined" sourceRef="payment-declined" targetRef="declined-end" />
<bpmn:endEvent id="declined-end" name="Declined"><bpmn:incoming>flow_declined</bpmn:incoming></bpmn:endEvent>
</bpmn:process>
<bpmn:error id="payment-declined-error" name="payment declined" errorCode="PAYMENT_DECLINED" />
<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{pid}">
<bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="152" y="102" width="36" height="36" /></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="charge-card_di" bpmnElement="charge-card"><dc:Bounds x="240" y="80" width="100" height="80" /></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="412" y="102" width="36" height="36" /></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="payment-declined_di" bpmnElement="payment-declined"><dc:Bounds x="322" y="142" width="36" height="36" /></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="declined-end_di" bpmnElement="declined-end"><dc:Bounds x="412" y="222" width="36" height="36" /></bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="flow_start_di" bpmnElement="flow_start"><di:waypoint x="188" y="120" /><di:waypoint x="240" y="120" /></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="flow_done_di" bpmnElement="flow_done"><di:waypoint x="340" y="120" /><di:waypoint x="412" y="120" /></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="flow_declined_di" bpmnElement="flow_declined"><di:waypoint x="340" y="178" /><di:waypoint x="340" y="240" /><di:waypoint x="412" y="240" /></bpmndi:BPMNEdge>
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
"""


def gateway_process(pid):
    return HEADER.format(pid=pid) + f"""<bpmn:process id="{pid}" name="Retry demo: incident without a job" isExecutable="true">
<bpmn:startEvent id="start"><bpmn:outgoing>flow_start</bpmn:outgoing></bpmn:startEvent>
<bpmn:sequenceFlow id="flow_start" sourceRef="start" targetRef="route-order" />
<bpmn:exclusiveGateway id="route-order" name="Big order?"><bpmn:incoming>flow_start</bpmn:incoming><bpmn:outgoing>flow_big</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="flow_big" sourceRef="route-order" targetRef="end"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=amount &gt; 100</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:endEvent id="end" name="Done"><bpmn:incoming>flow_big</bpmn:incoming></bpmn:endEvent>
</bpmn:process>
<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{pid}">
<bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="152" y="102" width="36" height="36" /></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="route-order_di" bpmnElement="route-order" isMarkerVisible="true"><dc:Bounds x="245" y="95" width="50" height="50" /></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="372" y="102" width="36" height="36" /></bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="flow_start_di" bpmnElement="flow_start"><di:waypoint x="188" y="120" /><di:waypoint x="245" y="120" /></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="flow_big_di" bpmnElement="flow_big"><di:waypoint x="295" y="120" /><di:waypoint x="372" y="120" /></bpmndi:BPMNEdge>
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
"""


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------


# The rows of the guide's "Seeded scenarios" table, by scenario id: the process and
# the state the operator finds. `{b3_retry_date}` is filled in at rendering.
GUIDE_ROWS = {
    "A1": ("retry-demo-backoff", "`charge-card` active, 2 retries left, 1 failed, waiting 24 h"),
    "A2": ("retry-demo-backoff", "same as A1 (for the Fail job dialog)"),
    "A3": ("retry-demo-backoff", "same as A1 (for a backoff which ends while you watch)"),
    "B1": ("retry-demo-exhausted", "`reserve-stock` failed, 0 retries, 3 failed, open incident"),
    "B2": ("retry-demo-exhausted", "same as B1"),
    "B3": ("retry-demo-exhausted", "failed, but retries set to 7 via the API with next delivery {b3_retry_date}; incident open"),
    "B4": ("retry-demo-exhausted", "same as B1"),
    "B5": ("retry-demo-exhausted", "same as B1"),
    "B6": ("retry-demo-exhausted", "exhausted, resolved, exhausted again: 6 failures, 1 resolved + 1 open incident"),
    "C1": ("retry-demo-long-history", "`sync-ledger` active, 3 of 15 retries left, 12 failed"),
    "D1": ("retry-demo-default-retries", "`send-invoice` active, 1 retry (the engine default), never failed"),
    "E1": ("retry-demo-bpmn-error", "`charge-card` active, 3 retries; the task catches `PAYMENT_DECLINED`"),
    "E2": ("retry-demo-bpmn-error", "same as E1 (for an error code nothing catches)"),
    "F1": ("retry-demo-incident-without-job", "gateway `route-order` found no flow: incident without a job"),
    "G1": ("retry-demo-user-task", "user task `approve-refund` completed, `refund-payment` active"),
    "H1": ("retry-demo-retries-expression",
           "`charge-card` failed, 0 retries, 1 failed, open incident; its retries `=attemptsAllowed + 1` "
           "no longer evaluate, as `attemptsAllowed` is now `\"many\"`"),
    "H2": ("retry-demo-retries-expression", "same as H1 (for the Incidents tab and the Variables tab)"),
}


def seed():
    seeded = []
    # the `retryAt` of A1 and B3, read back from the engine: the guide names them
    times = {}

    def record(scenario_id, title, instance_key, state):
        seeded.append((scenario_id, title, instance_key, state))
        print(f"  {scenario_id:<4} {instance_key}  {title}: {state}")

    print("Deploying the retry-demo process definitions")
    backoff = deploy(linear_process("retry-demo-backoff", "Retry demo: waiting out a backoff", [
        ("charge-card", "Charge card", "serviceTask", task_definition("demo-charge-card", 3, "PT24H")),
    ]))
    exhausted = deploy(linear_process("retry-demo-exhausted", "Retry demo: retries exhausted", [
        ("reserve-stock", "Reserve stock", "serviceTask", task_definition("demo-reserve-stock", 3, "PT0S")),
    ]))
    long_history = deploy(linear_process("retry-demo-long-history", "Retry demo: long failure history", [
        ("sync-ledger", "Sync ledger", "serviceTask", task_definition("demo-sync-ledger", 15, "PT0S")),
    ]))
    default_retries = deploy(linear_process("retry-demo-default-retries", "Retry demo: default retries", [
        ("send-invoice", "Send invoice", "serviceTask", task_definition("demo-send-invoice")),
    ]))
    bpmn_error = deploy(bpmn_error_process("retry-demo-bpmn-error"))
    gateway = deploy(gateway_process("retry-demo-incident-without-job"))
    retries_expression = deploy(linear_process("retry-demo-retries-expression", "Retry demo: retries expression", [
        ("charge-card", "Charge card", "serviceTask",
         task_definition("demo-charge-card-retries-expression", "=attemptsAllowed + 1", "PT0S")),
    ]))
    user_task = deploy(linear_process("retry-demo-user-task", "Retry demo: completed user task", [
        ("approve-refund", "Approve refund", "userTask", task_definition("demo-approve-refund")),
        ("refund-payment", "Refund payment", "serviceTask", task_definition("demo-refund-payment", 2, "PT5M")),
    ]))

    print("Starting and driving the scenario instances")

    # A: an active job waiting out a 24 h backoff after one failure (three copies,
    # because the tests change them).
    for scenario_id, purpose in (("A1", "update retries"), ("A2", "fail job dialog"), ("A3", "backoff ending live")):
        instance = start(backoff, {"scenario": f"{scenario_id} {purpose}"})
        job = job_of(instance, "charge-card")
        fail(job["key"], "java.net.ConnectException: payment service unavailable (seeded failure 1)")
        if scenario_id == "A1":
            times["backoff_end"] = retry_at_of(instance, "charge-card")
        record(scenario_id, f"backoff: {purpose}", instance, "active job, 2 retries left, 1 failed, waiting 24 h")

    # B: failed jobs whose retries are exhausted, each raising an incident naming the job.
    for scenario_id, purpose in (
        ("B1", "retry, resolve only"),
        ("B2", "retry with own retries and a delay"),
        ("B4", "incident resolved meanwhile"),
        ("B5", "retries refused by the engine"),
    ):
        instance = start(exhausted, {"scenario": f"{scenario_id} {purpose}"})
        fail_until_incident(instance, "reserve-stock", 3, "Stock service answered 503")
        record(scenario_id, f"exhausted: {purpose}", instance, "failed job, 0 retries, 3 failed, open incident")

    # B3: retries set by an operator through the API after the job failed, incident still open.
    instance = start(exhausted, {"scenario": "B3 operator retries kept"})
    job, _ = fail_until_incident(instance, "reserve-stock", 3, "Stock service answered 503")
    call("POST", f"/jobs/{job['key']}/retries", {"retries": 7, "retryAt": in_hours(23)})
    times["b3_retry"] = retry_at_of(instance, "reserve-stock", states=("failed",))
    record("B3", "exhausted: retries set after the failure are kept", instance,
           "failed job, retries set to 7 with next delivery in 23 h, incident still open")

    # B6: two series of attempts: exhausted, resolved, exhausted again.
    instance = start(exhausted, {"scenario": "B6 two series"})
    _, first_incident = fail_until_incident(instance, "reserve-stock", 3, "Stock service answered 503")
    call("POST", f"/incidents/{first_incident['key']}/resolve")
    fail_until_incident(instance, "reserve-stock", 3, "Stock service timed out")
    record("B6", "exhausted twice: two series, one resolved incident", instance,
           "failed job, 6 failures in history, 1 resolved and 1 open incident")

    # C: 12 failures of a job with 15 retries, more than one page of failure history.
    instance = start(long_history, {"scenario": "C1 long history"})
    job = job_of(instance, "sync-ledger")
    for attempt in range(1, 13):
        fail(job["key"], f"Ledger service rejected the batch (seeded failure {attempt})")
    record("C1", "long failure history", instance, "active job, 3 retries left, 12 failed")

    # D: a job whose task definition names no retries: the engine default of 1.
    instance = start(default_retries, {"scenario": "D1 default retries"})
    job_of(instance, "send-invoice")
    record("D1", "default retries", instance, "active job, 1 retry, never failed")

    # E: a job whose task catches the BPMN error PAYMENT_DECLINED on a boundary event.
    for scenario_id, purpose in (("E1", "caught BPMN error"), ("E2", "uncaught BPMN error")):
        instance = start(bpmn_error, {"scenario": f"{scenario_id} {purpose}"})
        job_of(instance, "charge-card")
        record(scenario_id, f"BPMN error: {purpose}", instance, "active job, 3 retries, never failed")

    # F: an incident no job raised: the gateway finds no flow for amount 1.
    instance = start(gateway, {"scenario": "F1 incident without a job", "amount": 1})
    any_open_incident(instance)
    record("F1", "incident without a job", instance, "open gateway incident, no job")

    # G: a completed user task followed by an active service task.
    instance = start(user_task, {"scenario": "G1 completed user task"})
    approval = job_of(instance, "approve-refund")
    call("POST", f"/jobs/{approval['key']}/complete", {"variables": {"approved": True}})
    job_of(instance, "refund-payment")
    record("G1", "completed user task", instance, "completed user task job, active service job")

    # H: a failed job whose retries are a FEEL expression which no longer evaluates: the
    # variable it reads was a number when the job was created and is a text now, so the
    # engine refuses to resolve the incident (409) until the variable is corrected or the
    # resolution gives the job retries of its own.
    for scenario_id, purpose in (("H1", "refused resolution, retry dialog"), ("H2", "refused resolution, incidents tab")):
        instance = start(retries_expression, {"scenario": f"{scenario_id} {purpose}", "attemptsAllowed": 0})
        fail_until_incident(instance, "charge-card", 1, "Card service answered 503")
        set_variables(instance, {"attemptsAllowed": "many"})
        record(scenario_id, f"retries expression: {purpose}", instance,
               "failed job, 0 retries, 1 failed, open incident, retries expression no longer evaluates")

    return seeded, times


def local_time(iso_timestamp):
    """An RFC 3339 timestamp of the engine as local time.

    Before Python 3.11, `fromisoformat` accepts neither a trailing `Z` nor other than 3 or
    6 fractional digits, and Go writes up to 9, so both are normalised first.
    """
    normalised = re.sub(r"[Zz]$", "+00:00", iso_timestamp)
    normalised = re.sub(r"\.(\d+)", lambda fraction: "." + fraction.group(1)[:6].ljust(6, "0"), normalised)
    return datetime.datetime.fromisoformat(normalised).astimezone()


def ui_time(moment):
    """The way the UI shows a moment, e.g. `Sep 29, 2026, 10:22:11 PM`."""
    return f"{moment:%b} {moment.day}, {moment:%Y}, {moment:%I:%M:%S %p}"


def write_guide(seeded, times, ui, template_path, out_dir):
    """Render the manual test guide from its template with this run's links and times."""
    template = template_path.read_text()
    backoff_end = local_time(times["backoff_end"])
    b3_retry = local_time(times["b3_retry"])
    values = {
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "backoff_end_date": f"{backoff_end:%Y-%m-%d at %H:%M}",
        "backoff_end_ui": ui_time(backoff_end),
        "backoff_end_day": f"{backoff_end:%b} {backoff_end.day}",
        "b3_retry_date": f"{b3_retry:%Y-%m-%d at %H:%M}",
        "b3_retry_ui": ui_time(b3_retry),
    }
    instances = {scenario_id: instance_key for scenario_id, _, instance_key, _ in seeded}
    rows = []
    for scenario_id in sorted(GUIDE_ROWS):
        process_id, state = GUIDE_ROWS[scenario_id]
        key = instances[scenario_id]
        state = state.format(b3_retry_date=values["b3_retry_date"])
        rows.append(f"| {scenario_id} | {process_id} | [{key}]({ui}/process-instances/{key}) | {state} |")
    values["scenario_table"] = "\n".join(rows)
    rendered = template
    for name, value in values.items():
        rendered = rendered.replace("{{" + name + "}}", value)
    left_over = re.findall(r"\{\{\w+\}\}", rendered)
    if left_over:
        raise RuntimeError(f"the guide template has placeholders the script does not fill: {left_over}")
    (out_dir / "JOB_RETRY_MANUAL_TEST.md").write_text(rendered)


def write_links(seeded, ui, out_dir):
    lines = [
        "# Seeded job retry scenarios",
        "",
        f"Generated by `seed_job_retry_scenarios.py` on {datetime.datetime.now().isoformat(timespec='seconds')}.",
        "The scenario ids match `JOB_RETRY_MANUAL_TEST.md`. Rerun the script for fresh instances.",
        "",
        "| Scenario | What it is | State after seeding | Open in the UI |",
        "| --- | --- | --- | --- |",
    ]
    for scenario_id, title, instance_key, state in seeded:
        lines.append(f"| {scenario_id} | {title} | {state} | [{instance_key}]({ui}/process-instances/{instance_key}) |")
    (out_dir / "seeded-instances.md").write_text("\n".join(lines) + "\n")


def main():
    global ENGINE
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--engine", default="http://localhost:8080", help="engine REST base URL")
    parser.add_argument("--ui", default="http://localhost:3000", help="UI base URL for the generated links")
    parser.add_argument("--template", help=f"path of {TEMPLATE_NAME} (default: next to the script, else the current directory)")
    parser.add_argument("--out-dir", help="where the guide and seeded-instances.md are written (default: next to the template)")
    args = parser.parse_args()
    ENGINE = args.engine.rstrip("/")
    # found before anything is seeded: a run whose guide cannot be written is wasted
    template_path = find_template(args.template)
    out_dir = pathlib.Path(args.out_dir).expanduser().resolve() if args.out_dir else template_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        wait_until_partition_serves()
    except (OSError, RuntimeError) as error:
        # The job retries migration was changed in place several times while the feature was under
        # review and is not applied a second time. Match the SQLite error, not a column name: the
        # engine's message quotes the whole SELECT, so it names every column, missing or not.
        missing = re.search(r"no such column: (?:\w+\.)?(\w+)", str(error))
        if missing:
            sys.exit(f"The engine at {ENGINE} runs on a data directory created by an earlier build of the "
                     f"job retries migration, which lacks the column `{missing.group(1)}`, so it cannot read "
                     "jobs. Stop the engine, delete its data directory (`zen_bpm_node_data`), start it "
                     "again, then rerun this script.")
        sys.exit(f"The engine at {ENGINE} does not answer ({error}). Start it first.")
    seeded, times = seed()
    ui = args.ui.rstrip("/")
    write_links(seeded, ui, out_dir)
    write_guide(seeded, times, ui, template_path, out_dir)
    print(f"\nWrote {out_dir / 'seeded-instances.md'} and {out_dir / 'JOB_RETRY_MANUAL_TEST.md'}"
          f" (template: {template_path})")


if __name__ == "__main__":
    main()
