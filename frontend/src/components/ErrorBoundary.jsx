import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reloading: false };
  }

  static getDerivedStateFromError(error) {
    const isChunkLoadError = error?.name === 'ChunkLoadError' || 
      (error?.message && (error.message.includes('Failed to fetch dynamically imported module') || error.message.includes('Loading chunk')));
      
    if (isChunkLoadError) {
      const lastReload = sessionStorage.getItem('chunk_failed_reload_time');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('chunk_failed_reload_time', now.toString());
        window.location.reload();
        return { hasError: true, error, reloading: true };
      }
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    if (!this.state.reloading) {
      this.setState({ errorInfo });
    }
  }

  render() {
    if (this.state.reloading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
          <Typography variant="h6" color="text.secondary">
            Applying update, please wait...
          </Typography>
        </Box>
      );
    }
    
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3, bgcolor: 'background.default' }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 600, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h5" color="error" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              A critical error occurred while rendering this page.
            </Typography>
            {this.state.error && (
              <Box sx={{ mt: 2, mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'left', overflow: 'auto', maxHeight: 200 }}>
                <Typography variant="body2" component="pre" sx={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'error.dark' }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" startIcon={<Refresh />} onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button variant="outlined" onClick={() => window.location.href = '/'}>
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
