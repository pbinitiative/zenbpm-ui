import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { BpmnDiagram } from './BpmnDiagram';

// Simple BPMN diagram XML
const simpleBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Process Order">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_2" name="Send Notification">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="185" y="142" width="24" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2">
        <dc:Bounds x="430" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="592" y="99" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="600" y="142" width="20" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" /><di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" /><di:waypoint x="430" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="530" y="117" /><di:waypoint x="592" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const meta: Meta<typeof BpmnDiagram> = {
  title: 'Components/BpmnDiagram',
  component: BpmnDiagram,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'number' },
      description: 'Height of the diagram container',
    },
    minHeight: {
      control: { type: 'number' },
      description: 'Minimum height of the diagram container',
    },
    interactive: {
      control: 'boolean',
      description: 'Whether elements can be clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BpmnDiagram>;

export const Default: Story = {
  args: {
    diagramData: simpleBpmnXml,
    height: 300,
  },
};

// Wrapper component for interactive story
const WithElementClickWrapper = () => {
  const [selectedElement, setSelectedElement] = useState<string | undefined>();

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Selected element: {selectedElement ?? 'None'}
      </Typography>
      <BpmnDiagram
        diagramData={simpleBpmnXml}
        height={300}
        onElementClick={setSelectedElement}
        selectedElement={selectedElement}
      />
    </Box>
  );
};

export const WithElementClick: Story = {
  render: () => <WithElementClickWrapper />,
};

export const WithStatistics: Story = {
  args: {
    diagramData: simpleBpmnXml,
    height: 300,
    elementStatistics: {
      Task_1: { activeCount: 5, incidentCount: 2 },
      Task_2: { activeCount: 3, incidentCount: 0 },
    },
  },
};

export const WithHistory: Story = {
  args: {
    diagramData: simpleBpmnXml,
    height: 300,
    history: [{ elementId: 'StartEvent_1' }, { elementId: 'Task_1' }],
    activeElements: [{ elementId: 'Task_2' }],
  },
};

export const SelectedElement: Story = {
  args: {
    diagramData: simpleBpmnXml,
    height: 300,
    selectedElement: 'Task_1',
    onElementClick: () => {},
  },
};

export const CustomHeight: Story = {
  args: {
    diagramData: simpleBpmnXml,
    height: 500,
    minHeight: 400,
  },
};

export const NonInteractive: Story = {
  args: {
    diagramData: simpleBpmnXml,
    height: 300,
    interactive: false,
  },
};
