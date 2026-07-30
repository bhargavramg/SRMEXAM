import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, Box
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

const SuccessDialog = ({
  open, onClose, title = 'Success',
  message = 'Operation completed successfully.',
  buttonLabel = 'Done',
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircle color="success" />
        <span>{title}</span>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          {buttonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuccessDialog;
