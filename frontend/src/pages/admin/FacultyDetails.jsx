import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, Button, Divider, 
  CircularProgress, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import { ArrowBack, Email, Phone, Business, Delete, Add } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../../api/adminApi';
import PageHeader from '../../components/PageHeader';
import AssignSubjectModal from './components/AssignSubjectModal';

const FacultyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: faculty, isLoading, error } = useQuery({
    queryKey: ['adminFacultyDetails', id],
    queryFn: () => adminApi.getFacultyById(id)
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => adminApi.deleteFacultyAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminFacultyDetails', id]);
    },
    onError: (err) => {
      console.error('Delete error details:', err);
      alert(err?.error || err?.message || JSON.stringify(err) || 'Error deleting assignment');
    }
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !faculty) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/faculty')} sx={{ mb: 2 }}>
          Back to Faculty Management
        </Button>
        <Typography color="error">Error loading faculty details. {error?.message}</Typography>
      </Box>
    );
  }

  const handleDeleteAssignment = (assignmentId) => {
    if (window.confirm("Are you sure you want to remove this assignment?")) {
      deleteAssignmentMutation.mutate(assignmentId);
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/faculty')} sx={{ mb: 2 }}>
        Back to Faculty List
      </Button>
      
      <PageHeader 
        title="Faculty Profile" 
        subtitle="Detailed view of faculty information and subject assignments"
      />

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
              <Box sx={{ 
                width: 80, height: 80, borderRadius: '50%', 
                bgcolor: 'primary.main', color: 'primary.contrastText',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 600, mb: 2
              }}>
                {faculty.name.charAt(0)}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>{faculty.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {faculty.employeeId}
              </Typography>
              <Chip 
                label={faculty.status} 
                size="small"
                color={faculty.status === 'ACTIVE' ? 'success' : 'error'}
                sx={{ mb: 3 }}
              />
              
              <Divider sx={{ w: '100%', mb: 2 }} />

              <Box sx={{ w: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Email color="action" />
                  <Typography variant="body2">{faculty.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Phone color="action" />
                  <Typography variant="body2">{faculty.phone || 'Not provided'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Business color="action" />
                  <Typography variant="body2">{faculty.department?.name || 'Unassigned Department'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Assignments Table */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Subject Assignments</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Add />} 
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  Assign Subject
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      <TableCell>Academic Year</TableCell>
                      <TableCell>Semester / Section</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {faculty.facultyAssignments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">No subjects assigned yet.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      faculty.facultyAssignments?.map((assignment) => {
                        const offering = assignment;
                        const subject = assignment?.subject?.name || 'N/A';
                        const subjectCode = offering?.subject?.code || '';
                        const year = assignment?.academicYear?.name || 'N/A';
                        const sem = assignment?.assessmentType?.name || 'N/A';
                        const sec = assignment?.assessmentType?.name || 'N/A';
                        const studentsCount = offering?.studentEnrollments?.length || 0;
                        
                        return (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{subject}</Typography>
                              <Typography variant="caption" color="text.secondary">{subjectCode}</Typography>
                            </TableCell>
                            <TableCell>{year}</TableCell>
                            <TableCell>{`Sem ${sem} - Sec ${sec}`}</TableCell>
                            <TableCell>
                              <Chip label={`${studentsCount} Students`} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => handleDeleteAssignment(assignment.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <AssignSubjectModal 
        open={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        facultyId={id} 
      />
    </Box>
  );
};

export default FacultyDetails;
