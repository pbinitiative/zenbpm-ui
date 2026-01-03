declare module 'camunda-bpmn-js/lib/camunda-platform/Modeler' {
  import type { BaseViewerOptions } from 'bpmn-js/lib/BaseViewer';

  interface ModelerOptions extends BaseViewerOptions {
    container?: HTMLElement;
    propertiesPanel?: {
      parent: HTMLElement;
    };
    keyboard?: {
      bindTo?: Document | HTMLElement;
    };
  }

  export default class CamundaPlatformModeler {
    constructor(options?: ModelerOptions);
    importXML(xml: string): Promise<{ warnings: string[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(name: string): any;
    destroy(): void;
  }
}
