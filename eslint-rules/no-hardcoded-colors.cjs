/**
 * ESLint rule to prevent hardcoded color values.
 * Colors should be defined in theme and referenced via themeColors or MUI palette.
 */

// Patterns to detect hardcoded colors
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/;
const RGB_REGEX = /^rgba?\s*\(/i;
const HSL_REGEX = /^hsla?\s*\(/i;

// CSS color properties that commonly contain colors
const COLOR_PROPERTIES = new Set([
  'color',
  'backgroundColor',
  'background',
  'borderColor',
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'outline',
  'fill',
  'stroke',
  'boxShadow',
  'textShadow',
  'caretColor',
  'columnRuleColor',
  'textDecorationColor',
  'bgcolor', // MUI shorthand
]);

function isColorValue(value) {
  if (typeof value !== 'string') return false;
  return HEX_COLOR_REGEX.test(value) || RGB_REGEX.test(value) || HSL_REGEX.test(value);
}

function getPropertyName(node) {
  if (node.key) {
    if (node.key.type === 'Identifier') return node.key.name;
    if (node.key.type === 'Literal') return String(node.key.value);
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded color values - use theme colors instead',
      category: 'Best Practices',
    },
    messages: {
      noHardcodedColor:
        'Hardcoded color "{{color}}" is not allowed. Use themeColors or MUI palette (e.g., \'primary.main\', \'grey.100\', \'text.secondary\').',
    },
    schema: [],
  },

  create(context) {
    return {
      // Check object properties (sx props, style objects, styled components)
      Property(node) {
        const propName = getPropertyName(node);
        if (!propName) return;

        // Check if this is a color-related property
        const isColorProp = COLOR_PROPERTIES.has(propName);

        // Check if the value is a hardcoded color
        if (node.value && node.value.type === 'Literal') {
          const value = node.value.value;
          if (isColorValue(value)) {
            // Allow if not a color property but still a hex (like in non-style contexts)
            // But warn if it's definitely a color property
            if (isColorProp) {
              context.report({
                node: node.value,
                messageId: 'noHardcodedColor',
                data: { color: value },
              });
            }
          }
        }

        // Check template literals
        if (node.value && node.value.type === 'TemplateLiteral') {
          node.value.quasis.forEach((quasi) => {
            const raw = quasi.value.raw;
            // Look for hex colors in template strings
            const hexMatches = raw.match(/#[0-9a-fA-F]{3,8}/g);
            if (hexMatches && isColorProp) {
              hexMatches.forEach((match) => {
                context.report({
                  node: quasi,
                  messageId: 'noHardcodedColor',
                  data: { color: match },
                });
              });
            }
          });
        }
      },

      // Check JSX attribute values directly (e.g., color="#fff")
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return;

        const attrName = node.name.name;
        if (!COLOR_PROPERTIES.has(attrName)) return;

        if (node.value && node.value.type === 'Literal') {
          const value = node.value.value;
          if (isColorValue(value)) {
            context.report({
              node: node.value,
              messageId: 'noHardcodedColor',
              data: { color: value },
            });
          }
        }
      },
    };
  },
};
