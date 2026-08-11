import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import { AlertCircle, CheckCircle, Clock, FileQuestion, HelpCircle, AlertTriangle, X } from 'lucide-react';

export default function SubmitExamModal({ open, onClose, onConfirm, stats }) {
  const { total, answered, unanswered, marked, remainingTime } = stats;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <AlertTriangle size={24} color="#f59e0b" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Submit Examination
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ mr: -1 }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 3 }}>
          You are about to submit your examination. Please review the following before submitting:
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}><FileQuestion size={24} /></Box>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>{total}</Typography>
                <Typography variant="caption" color="text.secondary">Total Questions</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F0FDF4', borderRadius: 2 }}>
              <Box sx={{ color: 'success.main', display: 'flex' }}><CheckCircle size={24} /></Box>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>{answered}</Typography>
                <Typography variant="caption" color="text.secondary">Answered</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#FEF2F2', borderRadius: 2 }}>
              <Box sx={{ color: 'error.main', display: 'flex' }}><HelpCircle size={24} /></Box>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>{unanswered}</Typography>
                <Typography variant="caption" color="text.secondary">Not Answered</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#FFFBEB', borderRadius: 2 }}>
              <Box sx={{ color: 'warning.main', display: 'flex' }}><AlertCircle size={24} /></Box>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>{marked}</Typography>
                <Typography variant="caption" color="text.secondary">Marked for Review</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, p: 2, bgcolor: '#F1F5F9', borderRadius: 2 }}>
          <Clock size={20} color="#64748B" />
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            Remaining Time: {remainingTime}
          </Typography>
        </Box>

        <Box sx={{ p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
          <Typography variant="body2" color="error.900" fontWeight={600}>
            Warning: Once submitted, your answers cannot be changed.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Continue Exam
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" disableElevation>
          Submit Exam
        </Button>
      </DialogActions>
    </Dialog>
  );
}
