/**
 * ESLint rule to prevent inline style props.
 * Use MUI sx prop or styled components instead.
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow inline style prop - use sx prop or styled components instead',
      category: 'Best Practices',
    },
    messages: {
      noInlineStyle:
        'Inline "style" prop is not allowed. Use MUI "sx" prop or styled components instead.',
    },
    schema: [],
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return;

        if (node.name.name === 'style') {
          // Check if this is on a DOM element or component
          const parent = node.parent;
          if (parent && parent.type === 'JSXOpeningElement') {
            const elementName = parent.name;

            // Allow style on SVG elements (often needed for dynamic styling)
            if (elementName.type === 'JSXIdentifier') {
              const name = elementName.name;
              // Skip SVG-related elements where style is commonly needed
              const svgElements = [
                'svg',
                'path',
                'circle',
                'rect',
                'line',
                'polygon',
                'polyline',
                'ellipse',
                'g',
                'text',
                'tspan',
                'defs',
                'use',
                'symbol',
                'marker',
              ];
              if (svgElements.includes(name)) {
                return;
              }
            }

            context.report({
              node,
              messageId: 'noInlineStyle',
            });
          }
        }
      },
    };
  },
};
