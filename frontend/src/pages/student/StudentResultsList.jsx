import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';

export default function StudentResultsList() {
  const navigate = useNavigate();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['studentResults'],
    queryFn: () => studentApi.getResults()
  });

  const columns = [
    { field: 'exam', headerName: 'Exam Title', flex: 2, minWidth: 200, valueGetter: (params) => params.row.exam?.title },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 150, valueGetter: (params) => params.row.exam?.facultyAssignment?.subject?.name },
    { field: 'score', headerName: 'Score', width: 100, valueGetter: (params) => `${params.row.score} / ${params.row.exam?.totalMarks}` },
    { field: 'percentage', headerName: 'Percentage', width: 120, valueGetter: (params) => `${((params.row.score / params.row.exam?.totalMarks) * 100).toFixed(1)}%` },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => (
       <Chip 
         label={params.row.status} 
         color={params.row.status === 'PASSED' ? 'success' : params.row.status === 'FAILED' ? 'error' : 'default'} 
         size="small" 
       />
    )},
    { field: 'actions', headerName: 'Actions', width: 150, renderCell: (params) => (
       <Button size="small" variant="outlined" onClick={() => navigate(`/student/exam/${params.row.examId}/result`)}>
         View Details
       </Button>
    )}
  ];

  return (
    <Box>
      <PageHeader title="My Results" subtitle="View your past examination scores and feedback" breadcrumbs={[{ label: 'Student' }, { label: 'Results' }]} />
      
      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 3 }}>
          <CardContent>
            {results.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ p: 2 }}>
                Your exam results will appear here once published by the faculty.
              </Typography>
            ) : (
              <DataTable
                rows={results}
                columns={columns}
                getRowId={(row) => row.id}
              />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
