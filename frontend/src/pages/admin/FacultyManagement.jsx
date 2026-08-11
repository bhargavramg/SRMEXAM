import React, { useState, useMemo } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, Paper, IconButton, Chip, Menu, MenuItem, 
  CircularProgress, Tooltip, InputAdornment 
} from '@mui/material';
import { 
  Search, MoreVert, Add, Visibility, Edit, LockReset, Delete, CheckCircle, Cancel 
} from '@mui/icons-material';
import { Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import PageHeader from '../../components/PageHeader';
import FacultyDialogs from './components/FacultyDialogs';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '../../components/ConfirmDialog';

const FacultyManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Filters & Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialog State
  const [dialogState, setDialogState] = useState({ type: null, data: null }); // type: 'add' | 'edit'
  const [confirmState, setConfirmState] = useState({ open: false, type: null, data: null }); // type: 'delete' | 'reset'

  // Menu State
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Queries
  const { data: facultyList, isLoading, error } = useQuery({
    queryKey: ['adminFaculty'],
    queryFn: () => adminApi.getFacultyList()
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateFaculty(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['adminFaculty'])
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => adminApi.resetFacultyPassword(id),
    onSuccess: () => {
      enqueueSnackbar('Password reset successfully.', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Error resetting password', { variant: 'error' })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteFaculty(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminFaculty']);
      enqueueSnackbar('Faculty deleted successfully', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Error deleting faculty', { variant: 'error' })
  });

  // Handlers
  const handleMenuOpen = (event, faculty) => {
    setAnchorEl(event.currentTarget);
    setSelectedFaculty(faculty);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFaculty(null);
  };

  const handleViewProfile = () => {
    navigate(`/admin/faculty/${selectedFaculty.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    setDialogState({ type: 'edit', data: selectedFaculty });
    handleMenuClose();
  };

  const handleResetPassword = () => {
    setConfirmState({ open: true, type: 'reset', data: selectedFaculty });
    handleMenuClose();
  };

  const handleDelete = () => {
    setConfirmState({ open: true, type: 'delete', data: selectedFaculty });
    handleMenuClose();
  };

  const executeConfirmAction = () => {
    if (confirmState.type === 'delete') {
      deleteMutation.mutate(confirmState.data.id);
    } else if (confirmState.type === 'reset') {
      resetPasswordMutation.mutate(confirmState.data.id);
    }
    setConfirmState({ open: false, type: null, data: null });
  };

  const handleToggleStatus = () => {
    const newStatus = selectedFaculty.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateStatusMutation.mutate({ id: selectedFaculty.id, status: newStatus });
    handleMenuClose();
  };

  // Filtered Data & Stats
  const filteredData = useMemo(() => {
    if (!facultyList) return [];
    let filtered = facultyList;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(s) || 
        f.employeeId.toLowerCase().includes(s) || 
        f.email.toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(f => f.status === statusFilter);
    }
    return filtered;
  }, [facultyList, search, statusFilter]);

  const stats = useMemo(() => {
    if (!facultyList) return { total: 0, active: 0, assigned: 0, unassigned: 0 };
    const active = facultyList.filter(f => f.status === 'ACTIVE').length;
    const assigned = facultyList.filter(f => f.facultyAssignments && f.facultyAssignments.length > 0).length;
    return {
      total: facultyList.length,
      active,
      assigned,
      unassigned: facultyList.length - assigned
    };
  }, [facultyList]);

  const displayedRows = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}.lighter`, color: `${color}.main`, mr: 3 }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>{title}</Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <PageHeader 
        title="Faculty Management" 
        subtitle="Manage Faculty Profiles and Subject Assignments"
        action={
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setDialogState({ type: 'add', data: null })}
          >
            Add Faculty
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Faculty" value={stats.total} icon={<Users size={24} />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Faculty" value={stats.active} icon={<UserCheck size={24} />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Assigned Faculty" value={stats.assigned} icon={<CheckCircle size={24} />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Unassigned Faculty" value={stats.unassigned} icon={<UserX size={24} />} color="error" />
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              placeholder="Search faculty..."
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
              SelectProps={{ native: true }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </TextField>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Assignments</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : displayedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      No faculty members found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedRows.map((faculty) => (
                    <TableRow key={faculty.id} hover>
                      <TableCell>{faculty.employeeId}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ 
                            width: 32, height: 32, borderRadius: '50%', 
                            bgcolor: 'primary.lighter', color: 'primary.main',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 600, fontSize: '0.875rem'
                          }}>
                            {faculty.name.charAt(0)}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {faculty.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{faculty.email}</TableCell>
                      <TableCell>{faculty.department?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${faculty.facultyAssignments?.length || 0} Subjects`} 
                          size="small" 
                          color={faculty.facultyAssignments?.length > 0 ? 'info' : 'default'}
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={faculty.status} 
                          size="small"
                          color={faculty.status === 'ACTIVE' ? 'success' : 'error'}
                          sx={{ 
                            bgcolor: faculty.status === 'ACTIVE' ? 'success.lighter' : 'error.lighter',
                            color: faculty.status === 'ACTIVE' ? 'success.main' : 'error.main',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, faculty)}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { width: 200 } }}
      >
        <MenuItem onClick={handleViewProfile}>
          <Visibility fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
          View Profile
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
          Edit Faculty
        </MenuItem>
        <MenuItem onClick={handleResetPassword}>
          <LockReset fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
          Reset Password
        </MenuItem>
        <MenuItem onClick={handleToggleStatus}>
          {selectedFaculty?.status === 'ACTIVE' ? (
            <Cancel fontSize="small" sx={{ mr: 2, color: 'error.main' }} />
          ) : (
            <CheckCircle fontSize="small" sx={{ mr: 2, color: 'success.main' }} />
          )}
          {selectedFaculty?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Menu>

      <FacultyDialogs 
        open={Boolean(dialogState.type)} 
        type={dialogState.type}
        data={dialogState.data}
        onClose={() => setDialogState({ type: null, data: null })}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.type === 'delete' ? 'Delete Faculty' : 'Reset Password'}
        message={`Are you sure you want to ${confirmState.type === 'delete' ? 'delete' : 'reset the password for'} ${confirmState.data?.name}?`}
        warningText={confirmState.type === 'delete' ? 'This action cannot be undone and will remove all assignments for this faculty.' : ''}
        confirmText={confirmState.type === 'delete' ? 'Delete' : 'Reset Password'}
        confirmColor={confirmState.type === 'delete' ? 'error' : 'primary'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmState({ open: false, type: null, data: null })}
      />
    </Box>
  );
};

export default FacultyManagement;
