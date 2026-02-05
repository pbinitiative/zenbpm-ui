import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { IncidentDetailModal, type IncidentDetailModalProps } from './IncidentDetailModal';

const INCIDENT_DETAIL_MODAL_ID = 'incident-detail-modal';

export function useIncidentDetailModal() {
  const { openModal, closeModal } = useModal<IncidentDetailModalProps>(
    INCIDENT_DETAIL_MODAL_ID,
    IncidentDetailModal
  );

  const openIncidentDetail = useCallback(
    (props: Omit<IncidentDetailModalProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onResolve: (incidentKey) => {
          props.onResolve?.(incidentKey);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openIncidentDetail, closeIncidentDetail: closeModal };
}
