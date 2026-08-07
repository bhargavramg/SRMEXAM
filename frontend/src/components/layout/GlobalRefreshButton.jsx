import React from 'react';
import { Button, CircularProgress, IconButton } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useRefresh } from '../../contexts/RefreshContext';
import { useNetworkState } from '../../hooks/useNetworkState';

const GlobalRefreshButton = ({ isMobileView }) => {
  const { isRefreshing, triggerRefresh } = useRefresh();
  const isOnline = useNetworkState();

  if (isMobileView) {
    return (
      <IconButton
        color="primary"
        onClick={() => triggerRefresh()}
        disabled={isRefreshing || !isOnline}
      >
        {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
      </IconButton>
    );
  }

  return (
    <Button
      variant="outlined"
      color="primary"
      size="small"
      startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
      onClick={() => triggerRefresh()}
      disabled={isRefreshing || !isOnline}
      sx={{ borderRadius: 2 }}
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </Button>
  );
};

export default GlobalRefreshButton;
