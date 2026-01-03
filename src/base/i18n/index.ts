import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import commonEn from './locales/en/common.json';
import processesEn from './locales/en/processes.json';
import processInstanceEn from './locales/en/processInstance.json';
import decisionsEn from './locales/en/decisions.json';
import incidentsEn from './locales/en/incidents.json';
import userTasksEn from './locales/en/userTasks.json';
import designerEn from './locales/en/designer.json';

const resources = {
  en: {
    common: commonEn,
    processes: processesEn,
    processInstance: processInstanceEn,
    decisions: decisionsEn,
    incidents: incidentsEn,
    userTasks: userTasksEn,
    designer: designerEn,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
