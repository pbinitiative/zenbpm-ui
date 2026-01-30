declare module 'bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: any;
  export const BpmnPropertiesProviderModule: any;
  export const ZeebePropertiesProviderModule: any;
  export function useService(service: string, strict?: boolean): any;
}
