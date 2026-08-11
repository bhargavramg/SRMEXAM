import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Card, CardContent, CircularProgress, Alert
} from '@mui/material';
import {
  Add, Edit, Delete, Assessment, Category, TrendingUp, Palette
} from '@mui/icons-material';
import { HelpCircle } from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import ConfirmDialog from '../../components/ConfirmDialog';

const QuestionCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ id: null, name: '', description: '', color: '#1976d2' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // Analytics Dialog State
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await facultyApi.getCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenDialog = (category = null) => {
    if (category) {
      setIsEditing(true);
      setCurrentCategory({
        id: category.id,
        name: category.name,
        description: category.description || '',
        color: category.color || '#1976d2'
      });
    } else {
      setIsEditing(false);
      setCurrentCategory({ id: null, name: '', description: '', color: '#1976d2' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSave = async () => {
    if (!currentCategory.name.trim()) {
      enqueueSnackbar('Category name is required', { variant: 'error' });
      return;
    }

    try {
      if (isEditing) {
        await facultyApi.updateCategory(currentCategory.id, {
          name: currentCategory.name,
          description: currentCategory.description,
          color: currentCategory.color
        });
        enqueueSnackbar('Category updated successfully', { variant: 'success' });
      } else {
        await facultyApi.createCategory({
          name: currentCategory.name,
          description: currentCategory.description,
          color: currentCategory.color
        });
        enqueueSnackbar('Category created successfully', { variant: 'success' });
      }
      handleCloseDialog();
      fetchCategories();
    } catch (err) {
      const msg = err.error || err.response?.data?.error || 'Failed to save category';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleDelete = async (id) => {
    setCategoryToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await facultyApi.deleteCategory(categoryToDelete);
      enqueueSnackbar('Category deleted successfully', { variant: 'success' });
      fetchCategories();
    } catch (err) {
      const msg = err.error || err.response?.data?.error || 'Failed to delete category';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleViewAnalytics = async (id) => {
    setAnalyticsOpen(true);
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    try {
      const data = await facultyApi.getCategoryAnalytics(id);
      setAnalyticsData(data);
    } catch (err) {
      enqueueSnackbar('Failed to load analytics', { variant: 'error' });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Compute Stats
  const totalCategories = categories.length;
  const totalQuestions = categories.reduce((sum, c) => sum + (c._count?.questions || 0), 0);
  const mostUsed = categories.length > 0 
    ? categories.reduce((prev, current) => ((prev._count?.questions || 0) > (current._count?.questions || 0)) ? prev : current)
    : null;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Question Categories</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Create Category
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', mr: 2 }}>
                <Category />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Total Categories</Typography>
                <Typography variant="h4" fontWeight="bold">{totalCategories}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.dark', mr: 2 }}>
                <HelpCircle color="#1976d2" size={24} />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Total Questions</Typography>
                <Typography variant="h4" fontWeight="bold">{totalQuestions}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'success.dark', mr: 2 }}>
                <TrendingUp />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Most Used Category</Typography>
                <Typography variant="h6" fontWeight="bold" noWrap sx={{ maxWidth: 150 }}>
                  {mostUsed ? mostUsed.name : 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Table */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell>Category Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="center">Questions</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      No categories found. Create one to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: row.color || '#1976d2' }} />
                          <Typography fontWeight="medium">{row.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                          {row.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row._count?.questions || 0} size="small" color={row._count?.questions > 0 ? "primary" : "default"} />
                      </TableCell>
                      <TableCell>{row.createdBy?.name || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(row.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Analytics">
                          <IconButton size="small" color="info" onClick={() => handleViewAnalytics(row.id)}>
                            <Assessment fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(row)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <span>
                            <IconButton size="small" color="error" onClick={() => handleDelete(row.id)} disabled={(row._count?.questions || 0) > 0}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Category' : 'Create Category'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Category Name"
              fullWidth
              value={currentCategory.name}
              onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={currentCategory.description}
              onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Palette fontSize="small" /> Category Color
              </Typography>
              <input
                type="color"
                value={currentCategory.color}
                onChange={(e) => setCurrentCategory({ ...currentCategory, color: e.target.value })}
                style={{ width: '100%', height: 40, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Category Analytics</DialogTitle>
        <DialogContent dividers>
          {analyticsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : analyticsData ? (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h4" color="primary">{analyticsData.totalQuestions}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Questions</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h4" color="secondary">{analyticsData.averageMarks?.toFixed(1) || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Average Marks</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Difficulty Distribution</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label={`Easy: ${analyticsData.easyCount}`} color="success" variant="outlined" />
                <Chip label={`Medium: ${analyticsData.mediumCount}`} color="warning" variant="outlined" />
                <Chip label={`Hard: ${analyticsData.hardCount}`} color="error" variant="outlined" />
              </Box>
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Recently Added Questions</Typography>
              {analyticsData.recentlyAdded?.length > 0 ? (
                <Table size="small">
                  <TableBody>
                    {analyticsData.recentlyAdded.map(q => (
                      <TableRow key={q.id}>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.text}
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={q.difficulty} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">No questions added yet.</Typography>
              )}
            </Box>
          ) : (
            <Alert severity="error">Failed to load analytics data.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        warningText="Questions in this category will not be deleted but will lose this categorization."
        confirmText="Delete"
        confirmColor="error"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default QuestionCategories;
