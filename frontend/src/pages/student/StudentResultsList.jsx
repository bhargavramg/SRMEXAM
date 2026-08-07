import React from 'react';
import { Box, Typography, Card, CardContent, Button, CircularProgress, Chip, Paper } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import { Clock, CheckCircle, Award, AlertCircle, BookOpen } from 'lucide-react';

export default function StudentResultsList() {
  const navigate = useNavigate();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['studentResults'],
    queryFn: () => studentApi.getResults()
  });

  const columns = [
    { 
      field: 'examTitle', headerName: 'Exam', flex: 2, minWidth: 200,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.examTitle}</Typography>
          <Typography variant="caption" color="text.secondary">{row.subject}</Typography>
        </Box>
      )
    },
    { 
      field: 'status', headerName: 'Status', width: 160, 
      renderCell: ({ row }) => row.isProvisional ? (
        <Chip 
          icon={<Clock size={14} />}
          label="Under Evaluation" 
          color="warning" 
          size="small" 
          variant="filled"
          sx={{ fontWeight: 500 }}
        />
      ) : (
        <Chip 
          icon={<CheckCircle size={14} />}
          label="Published" 
          color="success" 
          size="small" 
          variant="filled"
          sx={{ fontWeight: 500 }}
        />
      )
    },
    { 
      field: 'score', headerName: 'Score', width: 120, 
      renderCell: ({ row }) => row.isProvisional ? (
        <Typography variant="body2" color="text.secondary">—</Typography>
      ) : (
        <Typography variant="body2" fontWeight={700}>{row.marksObtained ?? 0} / {row.totalMarks}</Typography>
      )
    },
    { 
      field: 'percentage', headerName: 'Percentage', width: 100, 
      renderCell: ({ row }) => row.isProvisional ? (
        <Typography variant="body2" color="text.secondary">—</Typography>
      ) : (
        <Typography variant="body2" fontWeight={600}>{row.percentage?.toFixed(1) ?? 0}%</Typography>
      )
    },
    { 
      field: 'grade', headerName: 'Grade', width: 90, 
      renderCell: ({ row }) => row.isProvisional ? (
        <Typography variant="body2" color="text.secondary">—</Typography>
      ) : (
        <Chip 
          label={row.grade || 'N/A'} 
          color={row.grade === 'F' ? 'error' : 'success'} 
          size="small" 
          variant="outlined"
        />
      )
    },
    { 
      field: 'result', headerName: 'Result', width: 100,
      renderCell: ({ row }) => row.isProvisional ? (
        <Typography variant="body2" color="text.secondary">—</Typography>
      ) : (
        <Chip 
          label={row.isPass ? 'Pass' : 'Fail'}
          color={row.isPass ? 'success' : 'error'}
          size="small"
          variant="filled"
        />
      )
    },
    { 
      field: 'actions', headerName: '', width: 140, 
      renderCell: ({ row }) => row.isProvisional ? (
        <Button size="small" variant="text" color="warning" disabled>
          Awaiting Results
        </Button>
      ) : (
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => navigate(`/student/exam/${row.examId}/result`)}
        >
          View Details
        </Button>
      )
    }
  ];

  return (
    <Box>
      <PageHeader 
        title="My Results" 
        subtitle="View your examination results and scores" 
        breadcrumbs={[{ label: 'Student' }, { label: 'Results' }]} 
      />
      
      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
      ) : results.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#FAFAFA' }}>
          <BookOpen size={48} color="#9CA3AF" />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>No Results Yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Your exam results will appear here once published by the faculty.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Info banner for provisional results */}
          {results.some(r => r.isProvisional) && (
            <Card sx={{ mb: 2, borderRadius: 2, bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 1.5 } }}>
                <AlertCircle size={18} color="#F59E0B" />
                <Typography variant="body2" color="text.secondary">
                  Some results are still under evaluation. Marks will be visible once your faculty publishes the results.
                </Typography>
              </CardContent>
            </Card>
          )}

          <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 3 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <DataTable
                rows={results}
                columns={columns}
                getRowId={(row) => row.id}
              />
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
