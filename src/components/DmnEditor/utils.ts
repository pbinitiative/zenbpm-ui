// Default empty DMN diagram with a single decision

import { randomId } from "@components/BpmnEditor/utils.ts";

export const emptyDiagram = () => {
    const decisionId = `Decision_${randomId()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
  xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
  xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
  xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"
  id="Definitions_${decisionId}"
  name="DRD"
  namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="${decisionId}" name="Decision 1">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="${decisionId}">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`
}
