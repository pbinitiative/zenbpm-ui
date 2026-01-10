/**
 * Local ESLint plugin for ZenBPM UI code quality rules.
 */

const noHardcodedColors = require('./no-hardcoded-colors.cjs');
const noInlineStyles = require('./no-inline-styles.cjs');

module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-inline-styles': noInlineStyles,
  },
};
