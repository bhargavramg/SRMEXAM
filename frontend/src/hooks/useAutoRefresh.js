import { useEffect, useRef } from 'react';
import { useNetworkState } from './useNetworkState';
import { useRefresh } from '../contexts/RefreshContext';

export function useAutoRefresh(callback, intervalMs) {
  const isOnline = useNetworkState();
  const { isRefreshing } = useRefresh();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isOnline || isRefreshing || !intervalMs) return;

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, isOnline, isRefreshing]);
}
