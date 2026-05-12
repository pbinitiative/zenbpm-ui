import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { TriggerMessageDialog, type TriggerMessageDialogProps } from './TriggerMessageDialog';
import type { MessageSubscription } from '@base/openapi';

const TRIGGER_MESSAGE_DIALOG_ID = 'trigger-message-dialog';

interface OpenTriggerMessageDialogProps {
  subscription: MessageSubscription;
  onTrigger: (messageName: string, correlationKey: string, variables: Record<string, unknown>) => Promise<void>;
}

export function useTriggerMessageDialog() {
  const { openModal, closeModal } = useModal<TriggerMessageDialogProps>(
    TRIGGER_MESSAGE_DIALOG_ID,
    TriggerMessageDialog,
  );

  const openTriggerMessageDialog = useCallback(
    (props: OpenTriggerMessageDialogProps) => {
      openModal({
        subscription: props.subscription,
        onTrigger: async (messageName, correlationKey, variables) => {
          await props.onTrigger(messageName, correlationKey, variables);
          closeModal();
        },
      });
    },
    [openModal, closeModal],
  );

  return { openTriggerMessageDialog };
}
