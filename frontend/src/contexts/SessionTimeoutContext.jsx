import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const SessionTimeoutContext = createContext(null);

export const SessionTimeoutProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  // Student/Admin 30m, Faculty 45m
  const getTimeoutMs = () => {
    if (!user) return 30 * 60 * 1000;
    if (user.role === 'FACULTY') return 45 * 60 * 1000;
    return 30 * 60 * 1000; // Default 30 mins
  };

  const WARNING_TIME_MS = 2 * 60 * 1000; // 2 minutes warning

  const resetTimer = () => {
    if (!user) return;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setShowWarning(false);

    const totalTime = getTimeoutMs();
    const warningTime = totalTime - WARNING_TIME_MS;

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, warningTime);

    timeoutRef.current = setTimeout(() => {
      logout();
      setShowWarning(false);
    }, totalTime);
  };

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      setShowWarning(false);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(e => window.addEventListener(e, handleActivity));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, showWarning]);

  const handleContinue = () => {
    resetTimer();
  };

  const handleLogout = () => {
    logout();
    setShowWarning(false);
  };

  return (
    <SessionTimeoutContext.Provider value={{}}>
      {children}
      <Dialog open={showWarning} disableEscapeKeyDown>
        <DialogTitle>Session Expiration Warning</DialogTitle>
        <DialogContent>
          <Typography>
            Your session will expire in 2 minutes due to inactivity.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogout} color="error">Logout</Button>
          <Button onClick={handleContinue} variant="contained" color="primary">Continue Session</Button>
        </DialogActions>
      </Dialog>
    </SessionTimeoutContext.Provider>
  );
};
