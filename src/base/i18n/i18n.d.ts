import 'i18next';
import 'react-i18next';
import type { Resources } from './resources';

// Augment i18next module
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: Resources;
  }
}

// Augment react-i18next module
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: Resources;
  }
}
