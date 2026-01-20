import type { QuickSelectOption } from '../types';
import { dateToISO } from './dateFormatters';

/**
 * Quick select option factories (labels provided by translations)
 * All dates are returned as ISO 8601 strings
 */
export const createQuickSelectOptions = (t: (key: string) => string): QuickSelectOption[] => [
  {
    label: t('common:dateRange.quickSelect.last15Minutes'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 15 * 60 * 1000);
      return { from: dateToISO(from), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last1Hour'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 60 * 60 * 1000);
      return { from: dateToISO(from), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last24Hours'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { from: dateToISO(from), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last7Days'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: dateToISO(from), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last30Days'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: dateToISO(from), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last90Days'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { from: dateToISO(from), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.today'),
    getValue: () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: dateToISO(startOfDay), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.thisWeek'),
    getValue: () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      return { from: dateToISO(startOfWeek), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.thisMonth'),
    getValue: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: dateToISO(startOfMonth), to: dateToISO(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.thisYear'),
    getValue: () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: dateToISO(startOfYear), to: dateToISO(now) };
    },
  },
];
