import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  warningText,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmColor = 'primary',
  icon = <AlertTriangle size={24} color="#f59e0b" />
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        {icon}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton onClick={onCancel} size="small" sx={{ mr: -1 }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1, mb: warningText ? 2 : 1, whiteSpace: 'pre-line' }}>
          {message}
        </Typography>
        
        {warningText && (
          <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
            <Typography variant="body2" color="warning.900" fontWeight={500}>
              {warningText}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onCancel} variant="outlined" color="inherit">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor} disableElevation>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
