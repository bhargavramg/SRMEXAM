import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Button, TextField, InputAdornment, IconButton,
  Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText, CircularProgress,
  Menu, MenuItem, Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  GetApp as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as PasswordIcon,
  Visibility as ViewIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DataGrid, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import facultyApi from '../../api/facultyApi';
import { useSnackbar } from 'notistack';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import {
  AddEditStudentDialog,
  ResetPasswordDialog,
  ImportStudentDialog,
  ViewStudentDialog
} from './components/StudentDialogs';
import { useRefresh } from '../../contexts/RefreshContext';

const StatCard = ({ title, value, icon, color, loading }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography color="textSecondary" gutterBottom variant="overline">
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={80} height={50} />
        ) : (
          <Typography variant="h4" color="textPrimary">
            {value}
          </Typography>
        )}
      </Box>
      <Box sx={{ 
        bgcolor: `${color}.light`, 
        color: `${color}.main`, 
        p: 1.5, 
        borderRadius: 2,
        display: 'flex',
        opacity: 0.8
      }}>
        {icon}
      </Box>
    </CardContent>
  </Card>
);

const StudentManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { registerRefreshHandler } = useRefresh();
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });

  // Dialogs State
  const [dialogs, setDialogs] = useState({
    addEdit: false,
    resetPassword: false,
    import: false,
    view: false,
    delete: false
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  useEffect(() => {
    fetchData();
    const unregister = registerRefreshHandler(fetchData);
    return () => unregister();
  }, [registerRefreshHandler]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, assignmentsRes] = await Promise.all([
        facultyApi.getStudents(),
        facultyApi.getMyAssignments()
      ]);
      const data = Array.isArray(studentsRes) ? studentsRes : (studentsRes.data || []);
      setStudents(data);
      
      const assignmentsData = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes.data || []);
      setAssignments(assignmentsData);
      
      // Calculate stats
      const now = new Date();
      const thisMonth = data.filter(s => {
        const d = new Date(s.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      setStats({
        total: data.length,
        active: data.filter(s => s.status === 'ACTIVE').length,
        inactive: data.filter(s => s.status !== 'ACTIVE').length,
        newThisMonth: thisMonth
      });
    } catch (err) {
      enqueueSnackbar('Failed to fetch students', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (dialogName, student = null) => {
    setSelectedStudent(student);
    setDialogs({ ...dialogs, [dialogName]: true });
  };

  const handleCloseDialog = (dialogName) => {
    setDialogs({ ...dialogs, [dialogName]: false });
    setTimeout(() => setSelectedStudent(null), 300); // clear after animation
  };

  const handleSaveStudent = async (formData) => {
    try {
      if (selectedStudent) {
        await facultyApi.updateStudent(selectedStudent.id, formData);
        enqueueSnackbar('Student updated successfully', { variant: 'success' });
      } else {
        await facultyApi.createStudent(formData);
        enqueueSnackbar('Student created successfully', { variant: 'success' });
      }
      handleCloseDialog('addEdit');
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save student', { variant: 'error' });
    }
  };

  const handleResetPassword = async (password) => {
    try {
      await facultyApi.resetStudentPassword(selectedStudent.id, { password });
      enqueueSnackbar('Password reset successfully', { variant: 'success' });
      handleCloseDialog('resetPassword');
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to reset password', { variant: 'error' });
    }
  };

  const handleImport = async (data) => {
    try {
      const res = await facultyApi.importStudents(data);
      setImportSummary(res.data);
      handleCloseDialog('import');
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to import students', { variant: 'error' });
    }
  };

  const handleToggleStatus = async (student) => {
    const newStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await facultyApi.updateStudentStatus(student.id, { status: newStatus });
      enqueueSnackbar(`Student marked as ${newStatus}`, { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to update status', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await facultyApi.deleteStudent(selectedStudent.id);
      enqueueSnackbar('Student deleted successfully', { variant: 'success' });
      handleCloseDialog('delete');
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to delete student', { variant: 'error' });
      handleCloseDialog('delete'); // close on error so they see message
    }
  };

  const handleExportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      'Register Number': s.register_no,
      'Name': s.name,
      'Email': s.email,
      'Phone': s.phone,
      'Status': s.status,
      'Assigned Subject': s?.subject?.name || 'N/A',
      'Department': s?.enrollment?.course?.department?.name || 'N/A',
      'Semester': s.enrollment?.semester?.number || 'N/A',
      'Section': s.enrollment?.section?.name || 'N/A',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Management_Export.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Student Management Export", 14, 15);
    const tableColumn = ["Reg No", "Name", "Email", "Subject", "Status"];
    const tableRows = [];
    students.forEach(s => {
      const row = [
        s.register_no,
        s.name,
        s.email,
        s?.subject?.name || 'N/A',
        s.status
      ];
      tableRows.push(row);
    });
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save("Student_Management_Export.pdf");
  };

  const filteredStudents = students.filter(s => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return s.name?.toLowerCase().includes(lower) || 
           s.register_no?.toLowerCase().includes(lower) || 
           s.email?.toLowerCase().includes(lower);
  });

  const columns = [
    { field: 'register_no', headerName: 'Register No', width: 130 },
    { field: 'name', headerName: 'Student Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { 
      field: 'subject', headerName: 'Subject', width: 150,
      valueGetter: (value, row) => row?.subject?.name || 'N/A'
    },
    { 
      field: 'department', headerName: 'Department', width: 130,
      valueGetter: (value, row) => row?.enrollment?.course?.department?.name || 'N/A'
    },
    { 
      field: 'section', headerName: 'Section', width: 100,
      valueGetter: (value, row) => row?.enrollment?.section?.name || 'N/A'
    },
    {
      field: 'status', headerName: 'Status', width: 110,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={params.value === 'ACTIVE' ? 'success' : 'error'} 
          variant="outlined"
        />
      )
    },
    {
      field: 'firstLogin', headerName: 'Login Status', width: 180,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Default Pwd Active' : 'Password Changed'} 
          size="small" 
          color={params.value ? 'warning' : 'success'} 
          variant="outlined"
        />
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 250, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton size="small" color="info" onClick={() => handleOpenDialog('view', params.row)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Student">
            <IconButton size="small" color="primary" onClick={() => handleOpenDialog('addEdit', params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Password">
            <IconButton size="small" color="warning" onClick={() => handleOpenDialog('resetPassword', params.row)}>
              <PasswordIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
            <IconButton size="small" color={params.row.status === 'ACTIVE' ? 'error' : 'success'} onClick={() => handleToggleStatus(params.row)}>
              {params.row.status === 'ACTIVE' ? <InactiveIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleOpenDialog('delete', params.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Student Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
            Export Excel
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportPDF}>
            Export PDF
          </Button>
          <Button variant="contained" color="secondary" startIcon={<UploadIcon />} onClick={() => handleOpenDialog('import')}>
            Import
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog('addEdit')}>
            Add Student
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard loading={loading} title="Total Students" value={stats.total} icon={<PeopleIcon fontSize="large" />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard loading={loading} title="Active Students" value={stats.active} icon={<ActiveIcon fontSize="large" />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard loading={loading} title="Inactive Students" value={stats.inactive} icon={<InactiveIcon fontSize="large" />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard loading={loading} title="Added This Month" value={stats.newThisMonth} icon={<PersonAddIcon fontSize="large" />} color="info" />
        </Grid>
      </Grid>

      {/* Main Table Area */}
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            placeholder="Search by name, reg no, email..."
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ width: 300 }}
          />
          {/* We could add explicit subject/semester dropdown filters here if needed */}
        </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredStudents}
            columns={columns}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            loading={loading}
            disableRowSelectionOnClick
            components={{
              Toolbar: GridToolbarContainer
            }}
          />
        </Box>
      </Paper>

      {/* Dialogs */}
      {dialogs.addEdit && (
        <AddEditStudentDialog 
          open={dialogs.addEdit} 
          onClose={() => handleCloseDialog('addEdit')} 
          onSave={handleSaveStudent}
          student={selectedStudent}
          assignments={assignments}
        />
      )}
      
      {dialogs.resetPassword && (
        <ResetPasswordDialog 
          open={dialogs.resetPassword} 
          onClose={() => handleCloseDialog('resetPassword')} 
          onSave={handleResetPassword}
          student={selectedStudent}
        />
      )}

      {dialogs.import && (
        <ImportStudentDialog 
          open={dialogs.import} 
          onClose={() => handleCloseDialog('import')} 
          onImport={handleImport}
          assignments={assignments}
        />
      )}

      {dialogs.view && (
        <ViewStudentDialog 
          open={dialogs.view} 
          onClose={() => handleCloseDialog('view')} 
          student={selectedStudent}
        />
      )}

      <Dialog open={dialogs.delete} onClose={() => handleCloseDialog('delete')}>
        <DialogTitle>Delete Student</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{selectedStudent?.name}</strong>? 
            This action cannot be undone. If this student has taken exams, this action will fail.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseDialog('delete')}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Import Summary Dialog */}
      <Dialog open={!!importSummary} onClose={() => setImportSummary(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ActiveIcon /> Import Completed
        </DialogTitle>
        <DialogContent dividers>
          {importSummary && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4">{importSummary.results?.successful?.length || 0}</Typography>
                    <Typography variant="body2">Imported</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4">{importSummary.results?.duplicates?.length || 0}</Typography>
                    <Typography variant="body2">Skipped (Dupes)</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4">{importSummary.results?.invalid?.length || 0}</Typography>
                    <Typography variant="body2">Failed</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" gutterBottom>Students have been assigned to:</Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body1"><strong>Subject:</strong> {importSummary.assignedTo?.subject}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Section: {importSummary.assignedTo?.section} | Department: {importSummary.assignedTo?.department}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportSummary(null)} variant="contained" color="primary">Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentManagement;
