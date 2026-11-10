#!/usr/bin/env python3
"""Seed a running zenbpm engine with process instances for testing the start event listener UI by hand.

The process `listener-demo-order` has an end execution listener (job type `listener-demo-started`,
retries 3) on its start event, then a service task `listener-demo-ship` and an end event. The
script deploys it once (a redeployment of the same XML answers with the existing key) and starts
four fresh instances on every run, each driven through the engine's public REST API only:

  L2  waits for its listener job        (complete it in the UI)
  L3  waits for its listener job        (fail it in the UI)
  L4  spent the listener job's retries  (an incident stands on the start event)
  L5  passed its listener               (the service task's job waits; compare its dialogs)

It writes `seeded-instances.md` next to itself with a UI link for every instance and prints the
same table. The guide is START_LISTENER_MANUAL_TEST.md in the same directory.

Usage:
    python3 seed_start_listener_scenarios.py [--engine http://localhost:8080] [--ui http://localhost:3000]
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
LISTENER_TYPE = "listener-demo-started"

PROCESS_XML = f"""<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:zenbpm="http://zenbpm.pbinitiative.org/1.0" id="Definitions_listener-demo-order" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="listener-demo-order" name="Listener demo: order" isExecutable="true">
    <bpmn:startEvent id="OrderReceived" name="Order received">
      <bpmn:extensionElements>
        <zenbpm:executionListeners>
          <zenbpm:executionListener eventType="end" type="{LISTENER_TYPE}" retries="3" />
        </zenbpm:executionListeners>
      </bpmn:extensionElements>
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="OrderReceived" targetRef="ShipOrder" />
    <bpmn:serviceTask id="ShipOrder" name="Ship order">
      <bpmn:extensionElements>
        <zenbpm:taskDefinition type="listener-demo-ship" />
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ShipOrder" targetRef="OrderShipped" />
    <bpmn:endEvent id="OrderShipped" name="Order shipped">
      <bpmn:incoming>Flow_2</bpmn:incoming>
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
      <bpmndi:BPMNShape id="OrderShipped_di" bpmnElement="OrderShipped">
        <dc:Bounds x="416" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="196" y="120" />
        <di:waypoint x="256" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="356" y="120" />
        <di:waypoint x="416" y="120" />
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


def job_of(instance_key, element_id, states=("active",), timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        page = call("GET", f"/process-instances/{instance_key}/jobs?page=1&size=100")
        for job in page.get("items", []):
            if job["elementId"] == element_id and job["state"] in states:
                return job
        time.sleep(0.2)
    raise RuntimeError(f"timed out waiting for the job of {element_id} in instance {instance_key} in {states}")


def listener_job_of(instance_key, states=("active",)):
    job = job_of(instance_key, "OrderReceived", states)
    if job.get("listenerEventType") != "end":
        sys.exit("The engine created the start event's job without listenerEventType=end. It needs the "
                 "start event listener of zenbpm branch feature/e13.6-execution-listeners.")
    return job


def seed(ui):
    try:
        definition_key = deploy()
    except RuntimeError as error:
        if "executionListener" in str(error):
            sys.exit(f"The engine refused the listener process: {error}\nIt needs the start event "
                     "listener of zenbpm branch feature/e13.6-execution-listeners.")
        raise
    stamp = time.strftime("%H%M%S")
    seeded = []

    def record(scenario, title, instance_key):
        seeded.append((scenario, title, instance_key, f"{ui}/process-instances/{instance_key}"))

    waiting = start(definition_key, f"ORD-{stamp}-L2")
    listener_job_of(waiting)
    record("L2", "waits for its listener job: complete it", waiting)

    to_fail = start(definition_key, f"ORD-{stamp}-L3")
    listener_job_of(to_fail)
    record("L3", "waits for its listener job: fail it", to_fail)

    failed = start(definition_key, f"ORD-{stamp}-L4")
    job = listener_job_of(failed)
    for attempt in (1, 2, 3):
        # no backoff, so that the next failure finds the job active at once
        call("POST", f"/jobs/{job['key']}/fail",
             {"message": f"order service unavailable (attempt {attempt})", "retryBackoff": "PT0S"})
        job = job_of(failed, "OrderReceived", ("active", "failed"))
    listener_job_of(failed, ("failed",))
    record("L4", "spent the listener job's retries: incident on the start event", failed)

    passed = start(definition_key, f"ORD-{stamp}-L5")
    job = listener_job_of(passed)
    call("POST", f"/jobs/{job['key']}/complete", {"variables": {}})
    job_of(passed, "ShipOrder")
    record("L5", "passed its listener: the service task's job waits", passed)
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
        "# Seeded start event listener scenarios",
        "",
        f"Process definition: {ui}/process-definitions/{definition_key}",
        "",
        "| Scenario | Instance | Link |",
        "|---|---|---|",
        *[f"| {scenario}: {title} | `{key}` | {link} |" for scenario, title, key, link in seeded],
        "",
    ]
    (HERE / "seeded-instances.md").write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"Written to {HERE / 'seeded-instances.md'}")


if __name__ == "__main__":
    main()
