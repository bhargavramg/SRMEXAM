import React, { useState } from 'react';
import { Typography, Box, Card, CardContent, Button, Grid, Chip, IconButton, CircularProgress } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import facultyApi from '../../api/facultyApi';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import { Edit, PlayArrow, Publish, Delete, Assessment, Replay } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const ManageExams = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [examToPublish, setExamToPublish] = useState(null);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => facultyApi.getExams()
  });

  const publishMutation = useMutation({
    mutationFn: (id) => facultyApi.publishExam(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['exams']);
      enqueueSnackbar('Exam published successfully', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar("Error publishing exam: " + (err.response?.data?.error || err.message), { variant: 'error' })
  });

  const handlePublish = (id) => {
    setExamToPublish(id);
    setConfirmOpen(true);
  };

  const confirmPublish = () => {
    if (examToPublish) {
      publishMutation.mutate(examToPublish);
    }
    setConfirmOpen(false);
    setExamToPublish(null);
  };

  const columns = [
    { field: 'title', headerName: 'Exam Title', flex: 2, minWidth: 200 },
    { 
      field: 'subject', 
      headerName: 'Assignment', 
      flex: 2,
      renderCell: ({ row }) => {
        const fa = row.facultyAssignment;
        return fa?.subject?.name || 'Unknown Assignment';
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => {
        const s = params.value;
        let color = 'default';
        if (['SCHEDULED', 'ACTIVE'].includes(s)) color = 'success';
        if (s === 'DRAFT') color = 'warning';
        if (['COMPLETED', 'EVALUATION', 'CLOSED'].includes(s)) color = 'info';
        return <Chip label={s} color={color} size="small" />;
      }
    },
    { field: 'durationMins', headerName: 'Duration (m)', width: 120 },
    { field: 'totalMarks', headerName: 'Marks', width: 100 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 320,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', py: 0.5 }}>
          <IconButton size="small" color="primary" onClick={() => navigate(`/faculty/exams/${params.row.id}`)}>
            <Edit fontSize="small" />
          </IconButton>
          {params.row.status === 'DRAFT' && (
            <Button size="small" variant="contained" color="success" onClick={() => handlePublish(params.row.id)} startIcon={<Publish fontSize="small"/>}>
              Publish
            </Button>
          )}
          {['SCHEDULED', 'ACTIVE'].includes(params.row.status) && (
             <Button size="small" variant="outlined" color="primary" onClick={() => navigate(`/faculty/live-monitoring/${params.row.id}`)} startIcon={<PlayArrow fontSize="small"/>}>
               Monitor Live
             </Button>
          )}
          {['COMPLETED', 'EVALUATION', 'CLOSED'].includes(params.row.status) && (
             <Button size="small" variant="outlined" color="info" onClick={() => navigate(`/faculty/results/${params.row.id}`)} startIcon={<Assessment fontSize="small"/>}>
               Results
             </Button>
          )}
          {params.row.status !== 'DRAFT' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/faculty/exams/${params.row.id}/republish`)}
              startIcon={<Replay fontSize="small" />}
              sx={{
                borderColor: '#F59E0B',
                color: '#B45309',
                '&:hover': { bgcolor: 'rgba(245,158,11,0.08)', borderColor: '#D97706' },
              }}
            >
              Republish
            </Button>
          )}
        </Box>
      )
    }
  ];

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader 
        title="Manage Exams" 
        subtitle="View, edit, publish, and monitor your examinations"
        action={
          <Button variant="contained" color="primary" onClick={() => navigate('/faculty/create-exam')}>
            + Create New Exam
          </Button>
        }
      />
      <Card>
        <CardContent>
          <DataTable
            rows={exams}
            columns={columns}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>
      
      <ConfirmDialog
        open={confirmOpen}
        title="Publish Exam"
        message="Are you sure you want to publish this exam?"
        warningText="This will notify eligible students and they will be able to take the exam."
        confirmText="Publish"
        confirmColor="primary"
        onConfirm={confirmPublish}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default ManageExams;
