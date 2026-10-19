import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from './Toast';

export function PwaUpdateListener() {
  const toast = useToast();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodic check for SW update (every 1 hour)
      if (r) {
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA service worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast({
        message: 'A new version of Loop is available.',
        action: {
          label: 'Update',
          onClick: () => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          },
        },
        duration: 0, // sticky until user updates
      });
    }
  }, [needRefresh, toast, updateServiceWorker, setNeedRefresh]);

  return null;
}
