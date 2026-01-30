import { createElement } from '@bpmn-io/properties-panel/preact';
import { useService } from 'bpmn-js-properties-panel';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Read the ZEN_FORM zeebe:Property value from an element */
function getZenFormValue(element: any): string {
  const bo = element.businessObject;
  const extensionElements = bo.extensionElements;
  if (!extensionElements) return '';

  const zeebeProperties = extensionElements.values?.find(
    (e: any) => e.$type === 'zeebe:Properties',
  );
  if (!zeebeProperties) return '';

  const prop = zeebeProperties.properties?.find(
    (p: any) => p.name === 'ZEN_FORM',
  );
  return prop?.value || '';
}

/**
 * "Design Form" button entry. Dispatches a CustomEvent so the
 * React layer can open the visual form designer dialog.
 */
function ZenFormDesignButtonEntry(props: { element: any }) {
  const { element } = props;
  const translate = useService('translate');

  const handleClick = () => {
    const currentValue = getZenFormValue(element);
    document.dispatchEvent(
      new CustomEvent('bpmn-open-form-designer', {
        detail: { elementId: element.id, value: currentValue },
      }),
    );
  };

  return createElement(
    'div',
    { class: 'bio-properties-panel-entry', style: 'padding: 0 10px 6px' },
    createElement(
      'button',
      {
        type: 'button',
        onClick: handleClick,
        style:
          'width: 100%; padding: 6px 12px; cursor: pointer; ' +
          'background: #4d90fe; color: white; border: none; border-radius: 3px; ' +
          'font-size: 13px; font-weight: 500;',
      },
      translate('Design Form'),
    ),
  );
}

/**
 * Custom properties panel provider that adds a "Zen Form" group
 * to bpmn:UserTask elements. Follows the bpmn-js DI module pattern.
 */
class ZenFormPropertiesProvider {
  static $inject = ['propertiesPanel'];

  constructor(propertiesPanel: any) {
    propertiesPanel.registerProvider(500, this);
  }

  getGroups(element: any) {
    return function (groups: any[]) {
      if (element.type === 'bpmn:UserTask') {
        groups.push({
          id: 'zenForm',
          label: 'Zen Form',
          entries: [
            {
              id: 'zenFormDesignButton',
              component: ZenFormDesignButtonEntry,
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
  __init__: ['zenFormPropertiesProvider'],
  zenFormPropertiesProvider: ['type', ZenFormPropertiesProvider],
};
