import { TextAreaEntry, isTextAreaEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Entry component for the JSON Form Schema textarea.
 * Rendered as a Preact component within the bpmn-js properties panel.
 * Uses useService hook to access the bpmn-js DI container.
 */
function JsonFormSchemaEntry(props: { element: any; id: string }) {
  const { element, id } = props;
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');
  const commandStack = useService('commandStack');

  const getValue = (): string => {
    const bo = element.businessObject;
    const extensionElements = bo.extensionElements;
    if (!extensionElements) return '';

    const zeebeProperties = extensionElements.values?.find(
      (e: any) => e.$type === 'zeebe:Properties',
    );
    if (!zeebeProperties) return '';

    const prop = zeebeProperties.properties?.find(
      (p: any) => p.name === 'JSON_FORM',
    );
    return prop?.value || '';
  };

  const setValue = (value: string) => {
    const bo = element.businessObject;
    const commands: any[] = [];

    // Get or create extensionElements
    let extensionElements = bo.extensionElements;
    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: [],
      });
      extensionElements.$parent = bo;
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: bo,
          properties: { extensionElements },
        },
      });
    }

    // Get or create zeebe:Properties
    let zeebeProperties = (extensionElements.values || []).find(
      (e: any) => e.$type === 'zeebe:Properties',
    );

    if (!zeebeProperties && value) {
      zeebeProperties = bpmnFactory.create('zeebe:Properties', {
        properties: [],
      });
      zeebeProperties.$parent = extensionElements;
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [...(extensionElements.values || []), zeebeProperties],
          },
        },
      });
    }

    if (!zeebeProperties) return;

    const properties = zeebeProperties.properties || [];
    const existingProp = properties.find(
      (p: any) => p.name === 'JSON_FORM',
    );

    if (value) {
      if (existingProp) {
        commands.push({
          cmd: 'element.updateModdleProperties',
          context: {
            element,
            moddleElement: existingProp,
            properties: { value },
          },
        });
      } else {
        const newProp = bpmnFactory.create('zeebe:Property', {
          name: 'JSON_FORM',
          value,
        });
        newProp.$parent = zeebeProperties;
        commands.push({
          cmd: 'element.updateModdleProperties',
          context: {
            element,
            moddleElement: zeebeProperties,
            properties: { properties: [...properties, newProp] },
          },
        });
      }
    } else if (existingProp) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: zeebeProperties,
          properties: {
            properties: properties.filter((p: any) => p !== existingProp),
          },
        },
      });
    }

    if (commands.length > 0) {
      commandStack.execute(
        'properties-panel.multi-command-executor',
        commands,
      );
    }
  };

  return TextAreaEntry({
    element,
    id,
    label: translate('JSON Form Schema'),
    getValue,
    setValue,
    debounce,
    monospace: true,
  });
}

/**
 * Custom properties panel provider that adds a "JSON Form" group
 * to bpmn:UserTask elements. Follows the bpmn-js DI module pattern.
 */
class JsonFormPropertiesProvider {
  static $inject = ['propertiesPanel'];

  constructor(propertiesPanel: any) {
    propertiesPanel.registerProvider(500, this);
  }

  getGroups(element: any) {
    return function (groups: any[]) {
      if (element.type === 'bpmn:UserTask') {
        groups.push({
          id: 'jsonForm',
          label: 'JSON Form',
          entries: [
            {
              id: 'jsonFormSchema',
              component: JsonFormSchemaEntry,
              isEdited: isTextAreaEntryEdited,
            },
          ],
        });
      }
      return groups;
    };
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * bpmn-js DI module definition.
 * Register via additionalModules on the modeler constructor.
 */
export const JsonFormPropertiesProviderModule = {
  __init__: ['jsonFormPropertiesProvider'],
  jsonFormPropertiesProvider: ['type', JsonFormPropertiesProvider],
};
