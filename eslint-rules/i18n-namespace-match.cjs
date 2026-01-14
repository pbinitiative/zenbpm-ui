/**
 * ESLint rule: Ensure t() calls only use namespaces declared in useTranslation()
 * AND that the translation keys actually exist in the JSON files.
 *
 * ✓ const { t } = useTranslation([ns.common, ns.processes]);
 *   t('table.noData');           // OK - uses default namespace (common) and key exists
 *   t('processes:title');        // OK - processes is declared and key exists
 *
 * ✗ const { t } = useTranslation([ns.common]);
 *   t('incidents:title');        // ERROR - incidents not declared
 *   t('common:nonexistent.key'); // ERROR - key doesn't exist in common.json
 */

const fs = require('fs');
const path = require('path');

// Cache for loaded translations
let translationsCache = null;

/**
 * Load all translation JSON files and build a map of valid keys
 */
function loadTranslations(context) {
  if (translationsCache) return translationsCache;

  const translations = {};

  // Find the locales directory relative to the eslint config
  const cwd = context.cwd || process.cwd();
  const localesDir = path.join(cwd, 'src/base/i18n/locales/en');

  if (!fs.existsSync(localesDir)) {
    // Fallback: try to find it relative to the file being linted
    const filename = context.filename || context.getFilename();
    const srcIndex = filename.indexOf('/src/');
    if (srcIndex !== -1) {
      const projectRoot = filename.substring(0, srcIndex);
      const altLocalesDir = path.join(projectRoot, 'src/base/i18n/locales/en');
      if (fs.existsSync(altLocalesDir)) {
        return loadTranslationsFromDir(altLocalesDir);
      }
    }
    return {};
  }

  return loadTranslationsFromDir(localesDir);
}

function loadTranslationsFromDir(localesDir) {
  const translations = {};

  try {
    const files = fs.readdirSync(localesDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const namespace = file.replace('.json', '');
      const filePath = path.join(localesDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Flatten the JSON to get all valid key paths
      translations[namespace] = new Set(flattenKeys(content));
    }
  } catch {
    // If we can't load translations, skip key validation
  }

  translationsCache = translations;
  return translations;
}

/**
 * Flatten nested object keys into dot-notation paths
 * e.g., { actions: { save: "Save" } } => ["actions", "actions.save"]
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...flattenKeys(obj[key], fullKey));
    }
  }

  return keys;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure t() calls only use namespaces declared in useTranslation() and that keys exist',
      category: 'Possible Errors',
    },
    messages: {
      undeclaredNamespace:
        "Namespace '{{namespace}}' is used in t() but not declared in useTranslation(). Add ns.{{namespace}} to useTranslation([...]).",
      missingTranslationKey:
        "Translation key '{{key}}' does not exist in '{{namespace}}.json'.",
    },
    schema: [],
  },

  create(context) {
    // Load translations once per lint run
    const translations = loadTranslations(context);

    // Stack of scopes to handle nested functions properly
    // Each scope tracks its own useTranslation declaration
    const scopeStack = [];

    // Get current declared namespaces (searches up the scope stack)
    function getDeclaredNamespaces() {
      for (let i = scopeStack.length - 1; i >= 0; i--) {
        if (scopeStack[i].hasUseTranslation) {
          return scopeStack[i].declaredNamespaces;
        }
      }
      return null; // No useTranslation found in any parent scope
    }

    // Get the default namespace from the first declared namespace
    function getDefaultNamespace() {
      for (let i = scopeStack.length - 1; i >= 0; i--) {
        if (scopeStack[i].hasUseTranslation && scopeStack[i].defaultNamespace) {
          return scopeStack[i].defaultNamespace;
        }
      }
      return 'common'; // Fallback default
    }

    function enterScope() {
      scopeStack.push({
        hasUseTranslation: false,
        declaredNamespaces: new Set(['common']),
        defaultNamespace: 'common',
      });
    }

    function exitScope() {
      scopeStack.pop();
    }

    /**
     * Check if a translation key exists in the given namespace
     */
    function checkKeyExists(node, namespace, key) {
      // Skip if we couldn't load translations
      if (!translations[namespace]) return;

      // Skip dynamic keys (containing variables)
      if (key.includes('${')) return;

      if (!translations[namespace].has(key)) {
        context.report({
          node,
          messageId: 'missingTranslationKey',
          data: { key: `${namespace}:${key}`, namespace },
        });
      }
    }

    return {
      // Track function boundaries
      FunctionDeclaration: enterScope,
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression: enterScope,
      'FunctionExpression:exit': exitScope,
      ArrowFunctionExpression: enterScope,
      'ArrowFunctionExpression:exit': exitScope,

      // Track useTranslation calls
      CallExpression(node) {
        if (scopeStack.length === 0) return;

        const currentScope = scopeStack[scopeStack.length - 1];

        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useTranslation' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'ArrayExpression'
        ) {
          currentScope.hasUseTranslation = true;
          currentScope.declaredNamespaces = new Set(['common']); // Reset with default

          // Extract namespaces from array: [ns.common, ns.processes]
          let firstNamespace = null;
          for (const element of node.arguments[0].elements) {
            if (element) {
              let namespaceName = null;

              // Handle ns.xxx pattern
              if (
                element.type === 'MemberExpression' &&
                element.object.type === 'Identifier' &&
                element.object.name === 'ns' &&
                element.property.type === 'Identifier'
              ) {
                namespaceName = element.property.name;
              }
              // Handle string literals: ['common', 'processes']
              else if (element.type === 'Literal' && typeof element.value === 'string') {
                namespaceName = element.value;
              }

              if (namespaceName) {
                currentScope.declaredNamespaces.add(namespaceName);
                if (!firstNamespace) {
                  firstNamespace = namespaceName;
                }
              }
            }
          }

          // The first namespace in the array is the default
          if (firstNamespace) {
            currentScope.defaultNamespace = firstNamespace;
          }
        }

        // Check t() calls
        if (node.callee.type === 'Identifier' && node.callee.name === 't' && node.arguments.length > 0) {
          const declaredNamespaces = getDeclaredNamespaces();
          if (!declaredNamespaces) return; // No useTranslation in scope

          const firstArg = node.arguments[0];

          // Handle string literal: t('namespace:key') or t('key')
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            const fullKey = firstArg.value;
            const colonIndex = fullKey.indexOf(':');

            if (colonIndex > 0) {
              // Explicit namespace: t('namespace:key')
              const namespace = fullKey.substring(0, colonIndex);
              const key = fullKey.substring(colonIndex + 1);

              if (!declaredNamespaces.has(namespace)) {
                context.report({
                  node: firstArg,
                  messageId: 'undeclaredNamespace',
                  data: { namespace },
                });
              } else {
                // Namespace is declared, check if key exists
                checkKeyExists(firstArg, namespace, key);
              }
            } else {
              // No prefix = using default namespace
              const defaultNs = getDefaultNamespace();
              checkKeyExists(firstArg, defaultNs, fullKey);
            }
          }

          // Handle template literal: t(`namespace:${key}`)
          if (firstArg.type === 'TemplateLiteral' && firstArg.quasis.length > 0) {
            const firstPart = firstArg.quasis[0].value.raw;
            const colonIndex = firstPart.indexOf(':');

            if (colonIndex > 0) {
              const namespace = firstPart.substring(0, colonIndex);
              if (!declaredNamespaces.has(namespace)) {
                context.report({
                  node: firstArg,
                  messageId: 'undeclaredNamespace',
                  data: { namespace },
                });
              }
              // Skip key existence check for template literals (dynamic keys)
            }
          }
        }
      },
    };
  },
};
