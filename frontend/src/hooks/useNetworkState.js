import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

export function useNetworkState() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      enqueueSnackbar('Connection restored.', { variant: 'success' });
      // We will trigger a custom event that RefreshContext can listen to for auto-refresh
      window.dispatchEvent(new CustomEvent('network:online'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      enqueueSnackbar('You are currently offline.', { variant: 'error', persist: true });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enqueueSnackbar]);

  return isOnline;
}
