import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Box } from '@mui/material';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

const AUTO_HIDE_DURATION = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, { severity = 'info', duration, action } = {}) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, severity, duration: duration || AUTO_HIDE_DURATION[severity] || 3000, action }]);
  }, []);

  const success = useCallback((message, opts) => notify(message, { ...opts, severity: 'success' }), [notify]);
  const error = useCallback((message, opts) => notify(message, { ...opts, severity: 'error' }), [notify]);
  const warning = useCallback((message, opts) => notify(message, { ...opts, severity: 'warning' }), [notify]);
  const info = useCallback((message, opts) => notify(message, { ...opts, severity: 'info' }), [notify]);

  const handleClose = (id) => (_, reason) => {
    if (reason === 'clickaway') return;
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify, success, error, warning, info }}>
      {children}
      {notifications.map((n, index) => (
        <Snackbar
          key={n.id}
          open={true}
          autoHideDuration={n.duration}
          onClose={handleClose(n.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: index * 8 }}
        >
          <Alert
            onClose={handleClose(n.id)}
            severity={n.severity}
            variant="filled"
            sx={{ width: '100%', minWidth: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            action={n.action}
          >
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
