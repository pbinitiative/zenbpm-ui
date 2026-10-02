import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { UpdateRetriesDialog, type UpdateRetriesDialogProps } from './UpdateRetriesDialog';
import type { Job } from '../types';
import type { JobRetriesRequest, UpdateJobRetriesRequest } from '../utils';

const UPDATE_RETRIES_DIALOG_ID = 'update-retries-dialog';

/** `Omit` applied to each member of a union, so that each mode keeps its own callback. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export function useUpdateRetriesDialog() {
  const { openModal, closeModal } = useModal<UpdateRetriesDialogProps>(
    UPDATE_RETRIES_DIALOG_ID,
    UpdateRetriesDialog
  );

  // The dialog stays open on a refusal so that it can show the engine's reason.
  const openUpdateRetriesDialog = useCallback(
    (props: DistributiveOmit<UpdateRetriesDialogProps, 'open' | 'onClose'>) => {
      if (props.mode === 'update') {
        openModal({
          ...props,
          onSubmit: async (job: Job, request: UpdateJobRetriesRequest) => {
            await props.onSubmit(job, request);
            closeModal();
          },
        });
      } else {
        openModal({
          ...props,
          onSubmit: async (job: Job, request: JobRetriesRequest) => {
            await props.onSubmit(job, request);
            closeModal();
          },
        });
      }
    },
    [openModal, closeModal]
  );

  return { openUpdateRetriesDialog, closeUpdateRetriesDialog: closeModal };
}
