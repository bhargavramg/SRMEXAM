import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, Paper, IconButton, Chip, Menu, MenuItem, 
  CircularProgress, Tooltip, InputAdornment, Dialog, DialogTitle, 
  DialogContent, DialogActions 
} from '@mui/material';
import { 
  Search, MoreVert, Add, Upload, Download, Visibility, 
  Edit, LockReset, Delete, CheckCircle, Cancel 
} from '@mui/icons-material';
import { Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import PageHeader from '../../components/PageHeader';
import * as XLSX from 'xlsx';
import AddStudentModal from './components/AddStudentModal';
import ImportStudentsModal from './components/ImportStudentsModal';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const StudentManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Filters & Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Menu State
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Queries
  const { data: statsData } = useQuery({
    queryKey: ['adminStudentStats'],
    queryFn: () => adminApi.getStudentStats()
  });

  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['adminStudents', page, rowsPerPage, search, statusFilter],
    queryFn: () => adminApi.getStudentList({
      page: page + 1, limit: rowsPerPage, search, status: statusFilter
    }),
    keepPreviousData: true
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (data) => adminApi.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminStudents']);
      queryClient.invalidateQueries(['adminStudentStats']);
      setIsAddModalOpen(false);
      enqueueSnackbar('Student added successfully', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Error adding student', { variant: 'error' })
  });

  const importMutation = useMutation({
    mutationFn: (students) => adminApi.importStudents(students),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminStudents']);
      queryClient.invalidateQueries(['adminStudentStats']);
      setIsImportModalOpen(false);
      enqueueSnackbar('Students imported successfully', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Error importing students', { variant: 'error' })
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateStudent(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['adminStudents'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminStudents']);
      queryClient.invalidateQueries(['adminStudentStats']);
      enqueueSnackbar('Student deleted successfully', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Error deleting student', { variant: 'error' })
  });

  // Handlers
  const handleMenuOpen = (event, student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleViewProfile = () => {
    navigate(`/admin/students/${selectedStudent.id}`);
    handleMenuClose();
  };

  const handleToggleStatus = () => {
    const newStatus = selectedStudent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateStatusMutation.mutate({ id: selectedStudent.id, status: newStatus });
    handleMenuClose();
  };

  const handleDelete = () => {
    setConfirmOpen(true);
    handleMenuClose();
  };

  const executeDelete = () => {
    if (selectedStudent) {
      deleteMutation.mutate(selectedStudent.id);
    }
    setConfirmOpen(false);
  };

  const statCards = [
    { title: 'Total Students', value: statsData?.total || 0, icon: <Users size={24} />, color: '#e3f2fd', iconColor: '#1976d2' },
    { title: 'Active Students', value: statsData?.active || 0, icon: <UserCheck size={24} />, color: '#e8f5e9', iconColor: '#2e7d32' },
    { title: 'Inactive Students', value: statsData?.inactive || 0, icon: <UserX size={24} />, color: '#ffebee', iconColor: '#d32f2f' },
    { title: 'Imported Today', value: statsData?.importedToday || 0, icon: <UserPlus size={24} />, color: '#f3e5f5', iconColor: '#9c27b0' },
  ];

  const handleExport = () => {
    if (!listData?.content || listData.content.length === 0) {
      enqueueSnackbar("No data available to export", { variant: 'warning', autoHideDuration: 5000 });
      return;
    }
    const exportData = listData.content.map(student => {
      const activeEnrollment = student.enrollments?.[0];
      return {
        'Register No': student.register_no || '-',
        'Student Name': student.name,
        'Email': student.email,
        'Mobile': student.phone || '-',
        'Department': student.department?.name || '-',
        'Course': activeEnrollment?.course?.name || '-',
        'Semester': activeEnrollment?.semester?.semesterNumber || '-',
        'Section': activeEnrollment?.section?.name || '-',
        'Status': student.status,
        'Created Date': new Date(student.createdAt).toLocaleString(),
        'Last Login': student.lastLogin ? new Date(student.lastLogin).toLocaleString() : 'Never'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "student_records.xlsx");
  };

  return (
    <Box>
      <PageHeader 
        title="Student Management" 
        subtitle="Manage student profiles, enrollments, and accounts" 
        action={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<Upload />} onClick={() => setIsImportModalOpen(true)}>Import</Button>
            <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>Export</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setIsAddModalOpen(true)}>Add Student</Button>
          </Box>
        }
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: card.color, color: card.iconColor, mr: 2, display: 'flex' }}>
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{card.value}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>{card.title}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ borderRadius: 2, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2 }}>
          <TextField
            placeholder="Search by Name, Email or Reg No..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
            }}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ width: 150 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </TextField>
          {/* Add more filters (Dept, Course) here later */}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Reg No</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isListLoading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}><CircularProgress /></TableCell></TableRow>
              ) : listData?.content?.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>No students found.</TableCell></TableRow>
              ) : (
                listData?.content?.map((student) => {
                  const activeEnrollment = student.enrollments?.[0];
                  return (
                    <TableRow key={student.id} hover>
                      <TableCell>{student.register_no || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.department?.code || '-'}</TableCell>
                      <TableCell>{activeEnrollment?.course?.code || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={student.status} 
                          size="small" 
                          color={student.status === 'ACTIVE' ? 'success' : 'error'} 
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, student)}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, 200]}
          component="div"
          count={listData?.totalElements || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewProfile}>
          <Visibility fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> View Profile
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Edit fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Edit Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <LockReset fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Reset Password
        </MenuItem>
        <MenuItem onClick={handleToggleStatus}>
          {selectedStudent?.status === 'ACTIVE' ? (
            <><Cancel fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} /> <Typography color="error">Deactivate</Typography></>
          ) : (
            <><CheckCircle fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} /> <Typography color="success.main">Activate</Typography></>
          )}
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} /> <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>

      {/* Modals */}
      <AddStudentModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => addMutation.mutate(data)}
        isLoading={addMutation.isLoading}
      />
      
      <ImportStudentsModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(data) => importMutation.mutate(data)}
        isLoading={importMutation.isLoading}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Student"
        message={`Are you sure you want to delete ${selectedStudent?.name}?`}
        warningText="This action cannot be undone and will remove all enrollments and exam results for this student."
        confirmText="Delete"
        confirmColor="error"
        onConfirm={executeDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default StudentManagement;
