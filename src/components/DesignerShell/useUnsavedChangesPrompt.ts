import { useEffect, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { useConfirmDialog } from '@components/ConfirmDialog';

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

  const isPromptingRef = useRef(false);
  const { openConfirm } = useConfirmDialog();

  useEffect(() => {
    if (blocker.state !== 'blocked' || isPromptingRef.current) return;
    isPromptingRef.current = true;

    void openConfirm({
      title: t('designer:messages.unsavedChangesLeaveTitle', 'Unsaved changes'),
      message: promptMessage,
      confirmText: t('common:actions.leave', 'Leave'),
      cancelText: t('common:actions.stay', 'Stay'),
      confirmColor: 'error',
      maxWidth: 'xs',
    }).then((ok) => {
      if (ok) blocker.proceed();
      else blocker.reset();
    }).finally(() => {
      isPromptingRef.current = false;
    });
  }, [blocker, promptMessage, openConfirm, t]);
}
