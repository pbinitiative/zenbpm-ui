declare module 'dmn-js/lib/NavigatedViewer' {
  interface ViewerOptions {
    container?: HTMLElement;
  }

  interface DmnViewer {
     
    get(name: string): any;
  }

  export default class DmnJS {
    constructor(options?: ViewerOptions);
    importXML(xml: string): Promise<{ warnings: string[] }>;
     
    get(name: string): any;
    getActiveViewer(): DmnViewer | null;
    getActiveView(): { type: string; element: unknown } | null;
    getViews(): Array<{ type: string; element: unknown }>;
    open(view: { type: string; element: unknown }): void;
    destroy(): void;
  }
}

declare module 'dmn-js/lib/Viewer' {
  export * from 'dmn-js/lib/NavigatedViewer';
  export { default } from 'dmn-js/lib/NavigatedViewer';
}

declare module 'dmn-js' {
  export * from 'dmn-js/lib/NavigatedViewer';
  export { default } from 'dmn-js/lib/NavigatedViewer';
}

declare module 'dmn-js/lib/Modeler' {
  interface ModelerOptions {
    container?: HTMLElement;
    drd?: {
      propertiesPanel?: {
        parent: HTMLElement;
      };
       
      additionalModules?: any[];
    };
    keyboard?: {
      bindTo?: Document | HTMLElement;
    };
  }

  interface DmnModelerViewer {
     
    get(name: string): any;
  }

  export default class DmnModeler {
    constructor(options?: ModelerOptions);
    importXML(xml: string): Promise<{ warnings: string[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;
     
    get(name: string): any;
    getActiveViewer(): DmnModelerViewer | null;
    getActiveView(): { type: string; element: unknown } | null;
    getViews(): Array<{ type: string; element: unknown }>;
    open(view: { type: string; element: unknown }): void;
    destroy(): void;
  }
}

declare module 'dmn-js-properties-panel' {
   
  export const DmnPropertiesPanelModule: any;
   
  export const DmnPropertiesProviderModule: any;
   
  export const CamundaPropertiesProviderModule: any;
}
