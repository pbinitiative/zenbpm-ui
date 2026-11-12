#!/usr/bin/env python3
"""Seed a running zenbpm engine with process instances for testing the execution listener UI by hand.

The process `listener-demo-order` carries listeners in every position the engine runs them:

  Order received    start event    end listener `listener-demo-started` (retries 3)
  Ship order        service task   start listeners `listener-demo-reserve`, `listener-demo-credit`,
                                   the task's own job `listener-demo-ship`,
                                   end listeners `listener-demo-notify` (retries 2), `listener-demo-archive`;
                                   an output mapping writes `reserved` to the instance as `stockReserved`
  Confirm delivery  user task      start listener `listener-demo-prepare`, the task's own job `listener-demo-confirm`

The engine runs the jobs of one element one at a time: its start listeners in the order of the
model, the element's own job, its end listeners. The script deploys the process once (a
redeployment of the same XML answers with the existing key) and starts fresh instances on every
run, each driven through the engine's public REST API only:

  L2  waits behind the start event's listener         (complete it in the UI)
  L3  waits behind the start event's listener         (fail it in the UI)
  L4  spent the retries of the start event's listener (an incident stands on the start event)
  L5  waits behind the task's first start listener    (walk the whole chain in the UI)
  L6  waits behind the task's first end listener      (four jobs of one element: chips, links, variables)
  L7  spent the retries of the task's end listener    (an incident stands on the task, and names the job)
  L8  waits behind the user task's start listener     (Assign is offered for the task's own job only)

It writes `seeded-instances.md` next to itself with a UI link for every instance and prints the
same table. The guide is EXECUTION_LISTENERS_MANUAL_TEST.md in the same directory.

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
ENGINE = "http://localhost:8080"
ENGINE_NEEDED = ("It needs the execution listeners of zenbpm branch feature/e13.6-execution-listeners, "
                 "which runs them on tasks as well as on start events.")

STARTED = "listener-demo-started"
RESERVE = "listener-demo-reserve"
CREDIT = "listener-demo-credit"
SHIP = "listener-demo-ship"
NOTIFY = "listener-demo-notify"
ARCHIVE = "listener-demo-archive"
PREPARE = "listener-demo-prepare"
CONFIRM = "listener-demo-confirm"

# Every job of the process in the order the engine creates it: (job type, element, listener event type).
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
# reaches the instance as `stockReserved` through the output mapping of the task.
COMPLETION_VARIABLES = {
    RESERVE: {"reserved": True},
    SHIP: {"trackingId": "TRK-1"},
}

PROCESS_XML = f"""<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:zenbpm="http://zenbpm.pbinitiative.org/1.0" id="Definitions_listener-demo-order" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="listener-demo-order" name="Listener demo: order" isExecutable="true">
    <bpmn:startEvent id="OrderReceived" name="Order received">
      <bpmn:extensionElements>
        <zenbpm:executionListeners>
          <zenbpm:executionListener eventType="end" type="{STARTED}" retries="3" />
        </zenbpm:executionListeners>
      </bpmn:extensionElements>
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="OrderReceived" targetRef="ShipOrder" />
    <bpmn:serviceTask id="ShipOrder" name="Ship order">
      <bpmn:extensionElements>
        <zenbpm:taskDefinition type="{SHIP}" />
        <zenbpm:executionListeners>
          <zenbpm:executionListener eventType="start" type="{RESERVE}" />
          <zenbpm:executionListener eventType="start" type="{CREDIT}" />
          <zenbpm:executionListener eventType="end" type="{NOTIFY}" retries="2" />
          <zenbpm:executionListener eventType="end" type="{ARCHIVE}" />
        </zenbpm:executionListeners>
        <zenbpm:ioMapping>
          <zenbpm:output source="=reserved" target="stockReserved" />
        </zenbpm:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ShipOrder" targetRef="ConfirmDelivery" />
    <bpmn:userTask id="ConfirmDelivery" name="Confirm delivery">
      <bpmn:extensionElements>
        <zenbpm:taskDefinition type="{CONFIRM}" />
        <zenbpm:executionListeners>
          <zenbpm:executionListener eventType="start" type="{PREPARE}" />
        </zenbpm:executionListeners>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="ConfirmDelivery" targetRef="OrderDelivered" />
    <bpmn:endEvent id="OrderDelivered" name="Order delivered">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="listener-demo-order">
      <bpmndi:BPMNShape id="OrderReceived_di" bpmnElement="OrderReceived">
        <dc:Bounds x="160" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ShipOrder_di" bpmnElement="ShipOrder">
        <dc:Bounds x="256" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ConfirmDelivery_di" bpmnElement="ConfirmDelivery">
        <dc:Bounds x="416" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="OrderDelivered_di" bpmnElement="OrderDelivered">
        <dc:Bounds x="576" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="196" y="120" />
        <di:waypoint x="256" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="356" y="120" />
        <di:waypoint x="416" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="516" y="120" />
        <di:waypoint x="576" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
"""


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


def deploy():
    # an engine started a moment ago answers before its partition is ready
    deadline = time.time() + 30
    while True:
        try:
            return call("POST", "/process-definitions", raw=PROCESS_XML.encode())["processDefinitionKey"]
        except RuntimeError as error:
            if "CLUSTER_ERROR" not in str(error) or time.time() > deadline:
                raise
            time.sleep(0.5)


def start(definition_key, order_id):
    return call("POST", "/process-instances",
                {"processDefinitionKey": definition_key, "variables": {"orderId": order_id}})["key"]


def job_of(instance_key, job_type, states=("active",), timeout=15):
    """Waits for the job of the type in the instance and checks that it is what the model says.

    The jobs of one element share its id, so the element alone does not name a job: a
    listener's job is told from the element's own by its listener event type.
    """
    element_id, listener_event_type = next((element, event) for type_, element, event in CHAIN if type_ == job_type)
    deadline = time.time() + timeout
    while time.time() < deadline:
        page = call("GET", f"/process-instances/{instance_key}/jobs?page=1&size=100")
        for job in page.get("items", []):
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
    """Completes the jobs of the chain before the one of the type, and answers that job, which then waits."""
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


def seed(ui):
    try:
        definition_key = deploy()
    except RuntimeError as error:
        if "listener" in str(error):
            sys.exit(f"The engine refused the listener process: {error}\n{ENGINE_NEEDED}")
        raise
    stamp = time.strftime("%H%M%S")
    seeded = []

    def scenario(name, title, prepare):
        instance_key = start(definition_key, f"ORD-{stamp}-{name}")
        prepare(instance_key)
        seeded.append((name, title, instance_key, f"{ui}/process-instances/{instance_key}"))

    scenario("L2", "waits behind the start event's listener: complete it",
             lambda instance: advance_to(instance, STARTED))
    scenario("L3", "waits behind the start event's listener: fail it",
             lambda instance: advance_to(instance, STARTED))
    scenario("L4", "spent the retries of the start event's listener: incident on the start event",
             lambda instance: (advance_to(instance, STARTED), spend_retries(instance, STARTED, 3)))
    scenario("L5", "waits behind the task's first start listener: walk the chain",
             lambda instance: advance_to(instance, RESERVE))
    scenario("L6", "waits behind the task's first end listener: four jobs of one element",
             lambda instance: advance_to(instance, NOTIFY))
    scenario("L7", "spent the retries of the task's end listener: incident on the task",
             lambda instance: (advance_to(instance, NOTIFY), spend_retries(instance, NOTIFY, 2)))
    scenario("L8", "waits behind the user task's start listener: Assign only for the task's own job",
             lambda instance: advance_to(instance, PREPARE))
    return definition_key, seeded


def main():
    global ENGINE
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--engine", default=ENGINE)
    parser.add_argument("--ui", default="http://localhost:3000")
    args = parser.parse_args()
    ENGINE = args.engine.rstrip("/")
    ui = args.ui.rstrip("/")

    definition_key, seeded = seed(ui)
    lines = [
        "# Seeded execution listener scenarios",
        "",
        f"Process definition: {ui}/process-definitions/{definition_key}",
        "",
        "| Scenario | Instance | Link |",
        "|---|---|---|",
        *[f"| {name}: {title} | `{key}` | {link} |" for name, title, key, link in seeded],
        "",
    ]
    (HERE / "seeded-instances.md").write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"Written to {HERE / 'seeded-instances.md'}")


if __name__ == "__main__":
    main()
