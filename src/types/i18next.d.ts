/**
 * i18next type augmentation for typed translations.
 * Types are derived from src/base/i18n/resources.ts (auto-generated)
 */
import 'i18next';
import type { Resources } from '../base/i18n/resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: Resources;
    strictKeyChecks: true;
  }
}
