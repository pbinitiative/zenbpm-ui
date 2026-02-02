import { useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';

/**
 * Warns user before leaving the page or navigating away when there are unsaved changes.
 * Uses native beforeunload for refresh/close and react-router blocker for in-app navigation.
 */
export function useUnsavedChangesPrompt(hasUnsavedChanges: boolean, message?: string) {
  const { t } = useTranslation([ns.designer]);
  const promptMessage = message ?? t('designer:messages.unsavedChangesLeavePrompt');

  // Browser tab close / refresh
  useBeforeUnload(
    (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        return '';
      }
      return undefined;
    },
    { capture: true }
  );

  // In-app navigation blocker
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const ok = window.confirm(promptMessage);
      if (ok) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, promptMessage]);
}
