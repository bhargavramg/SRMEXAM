import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshHandler, setRefreshHandler] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Components register their fetch function here
  const registerRefreshHandler = useCallback((handler) => {
    setRefreshHandler(() => handler);
    // Return cleanup function
    return () => setRefreshHandler(null);
  }, []);

  const triggerRefresh = useCallback(async (silent = false) => {
    if (isRefreshing) return;
    
    setIsRefreshing(!silent);
    try {
      if (refreshHandler) {
        await refreshHandler();
      } else {
        await queryClient.invalidateQueries();
      }
      if (!silent) {
        enqueueSnackbar('Data refreshed successfully.', { variant: 'success' });
      }
    } catch (error) {
      if (!silent) {
        enqueueSnackbar('Unable to refresh data. Please try again.', { variant: 'error' });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshHandler, isRefreshing, enqueueSnackbar, queryClient]);

  // Listen for connection restored event
  useEffect(() => {
    const handleOnline = () => {
      if (refreshHandler) {
        triggerRefresh(true);
      }
    };
    window.addEventListener('network:online', handleOnline);
    return () => window.removeEventListener('network:online', handleOnline);
  }, [refreshHandler, triggerRefresh]);

  return (
    <RefreshContext.Provider value={{ isRefreshing, registerRefreshHandler, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => useContext(RefreshContext);
