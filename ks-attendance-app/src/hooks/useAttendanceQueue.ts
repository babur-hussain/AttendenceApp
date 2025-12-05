/**
 * useAttendanceQueue - React Hook for Queue State
 */

import { useState, useEffect } from 'react';
import { AttendanceService, QueuedEvent } from '../services/AttendanceService';

export const useAttendanceQueue = () => {
  const [queue, setQueue] = useState<QueuedEvent[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const service = AttendanceService.getInstance();

  useEffect(() => {
    const refresh = () => setQueue(service.getLocalQueue());
    
    const listener = () => refresh();
    service.addEventListener(listener);
    refresh();

    return () => service.removeEventListener(listener);
  }, []);

  const reconcile = async () => {
    setIsReconciling(true);
    try {
      await service.reconcilePendingEvents();
    } finally {
      setIsReconciling(false);
    }
  };

  const retry = (id: string) => service.retryEvent(id);
  const deleteEvent = (id: string) => service.deleteEvent(id);
  const archive = (id: string) => service.archiveEvent(id);

  return { queue, isReconciling, reconcile, retry, deleteEvent, archive };
};
