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
    additionalModules?: unknown[];
  }

  export default class CamundaPlatformModeler {
    constructor(options?: ModelerOptions);
    importXML(xml: string): Promise<{ warnings: string[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;

    get(name: string): any;
    destroy(): void;
  }
}

declare module 'camunda-bpmn-js/lib/camunda-cloud/Modeler' {
  import type { BaseViewerOptions } from 'bpmn-js/lib/BaseViewer';

  interface ModelerOptions extends BaseViewerOptions {
    container?: HTMLElement;
    propertiesPanel?: {
      parent: HTMLElement;
    };
    keyboard?: {
      bindTo?: Document | HTMLElement;
    };
    additionalModules?: unknown[];
  }

  export default class CamundaCloudModeler {
    constructor(options?: ModelerOptions);
    importXML(xml: string): Promise<{ warnings: string[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;

    get(name: string): any;
    destroy(): void;
  }
}
