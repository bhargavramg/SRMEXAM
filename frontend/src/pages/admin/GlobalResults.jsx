import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Button } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../../api/adminApi';
import { LockOpen, Visibility } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

const GlobalResults = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['adminExams'],
    queryFn: () => adminApi.getExams()
  });

  const unlockMutation = useMutation({
    mutationFn: (examId) => adminApi.unlockResults(examId),
    onSuccess: (res) => {
      enqueueSnackbar(res.data?.message || 'Results unlocked successfully', { variant: 'success' });
      queryClient.invalidateQueries(['adminExams']);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.error || 'Failed to unlock results', { variant: 'error' });
    }
  });

  const columns = [
    { field: 'title', headerName: 'Exam Title', flex: 1 },
    { field: 'status', headerName: 'Status', width: 150 },
    { 
      field: 'faculty', 
      headerName: 'Faculty', 
      width: 200, 
      renderCell: ({ row }) => row.facultyAssignment?.faculty?.name || 'N/A' 
    },
    { 
      field: 'subject', 
      headerName: 'Subject', 
      width: 150, 
      renderCell: ({ row }) => row.facultyAssignment?.subject?.code || 'N/A' 
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Visibility />}>
            View
          </Button>
          {row.status === 'CLOSED' && (
            <Button 
              size="small" 
              variant="contained" 
              color="warning" 
              startIcon={<LockOpen />}
              onClick={() => unlockMutation.mutate(row.id)}
              disabled={unlockMutation.isLoading}
            >
              Unlock Results
            </Button>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box>
      <PageHeader title="Global Results" subtitle="University-Wide Results Dashboard & Exam Management" />
      
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>All University Exams</Typography>
          {isLoading ? (
            <CircularProgress />
          ) : (
            <DataTable 
              rows={exams} 
              columns={columns} 
              getRowId={(r) => r.id} 
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default GlobalResults;
