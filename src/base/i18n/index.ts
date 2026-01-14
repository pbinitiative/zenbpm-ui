/**
 * i18next configuration.
 * Resources are auto-generated in resources.ts - this file is manually maintained.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

// Re-export for convenience
export { ns, allNamespaces } from './resources';
export type { Resources, Namespace } from './resources';

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (_lngs, ns, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation: "${ns}:${key}"`);
    }
  },
});

export default i18n;
