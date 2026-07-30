import React, { useState } from 'react';
import { Typography, Box, Card, CardContent, Button, Grid, Chip, IconButton, CircularProgress } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import facultyApi from '../../api/facultyApi';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import { Edit, PlayArrow, Publish, Delete, Assessment } from '@mui/icons-material';

const ManageExams = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => facultyApi.getExams()
  });

  const publishMutation = useMutation({
    mutationFn: (id) => facultyApi.publishExam(id, {}),
    onSuccess: () => queryClient.invalidateQueries(['exams']),
    onError: (err) => alert("Error publishing exam: " + (err.response?.data?.error || err.message))
  });

  const handlePublish = (id) => {
    if (window.confirm("Are you sure you want to publish this exam? This will notify eligible students.")) {
      publishMutation.mutate(id);
    }
  };

  const columns = [
    { field: 'title', headerName: 'Exam Title', flex: 2, minWidth: 200 },
    { 
      field: 'subject', 
      headerName: 'Assignment', 
      flex: 2,
      valueGetter: (params) => {
        const fa = params.row.facultyAssignment;
        return `${fa?.subject?.name} (${fa?.section?.name})`;
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => {
        const s = params.value;
        let color = 'default';
        if (s === 'PUBLISHED') color = 'success';
        if (s === 'DRAFT') color = 'warning';
        if (s === 'COMPLETED') color = 'info';
        return <Chip label={s} color={color} size="small" />;
      }
    },
    { field: 'durationMins', headerName: 'Duration (m)', width: 120 },
    { field: 'totalMarks', headerName: 'Marks', width: 100 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" color="primary" onClick={() => navigate(`/faculty/exams/${params.row.id}`)}>
            <Edit fontSize="small" />
          </IconButton>
          {params.row.status === 'DRAFT' && (
            <Button size="small" variant="contained" color="success" onClick={() => handlePublish(params.row.id)} startIcon={<Publish fontSize="small"/>}>
              Publish
            </Button>
          )}
          {params.row.status === 'PUBLISHED' && (
             <Button size="small" variant="outlined" color="primary" onClick={() => navigate(`/faculty/live-monitoring/${params.row.id}`)} startIcon={<PlayArrow fontSize="small"/>}>
               Monitor Live
             </Button>
          )}
          {params.row.status === 'COMPLETED' && (
             <Button size="small" variant="outlined" color="info" onClick={() => navigate(`/faculty/results/${params.row.id}`)} startIcon={<Assessment fontSize="small"/>}>
               Results
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
    </Box>
  );
};

export default ManageExams;
