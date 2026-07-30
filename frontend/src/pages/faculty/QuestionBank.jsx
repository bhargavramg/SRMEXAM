import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Grid, Typography, Button, Chip, IconButton, Tooltip,
  TextField, Select, MenuItem, FormControl, InputLabel, InputAdornment,
  Stack, Menu, ListItemIcon, ListItemText, Divider, Card, CardContent,
} from '@mui/material';
import {
  Add, Search, FilterList, SortOutlined, CloudUpload, CloudDownload,
  Visibility, Edit, ContentCopy, Archive, Delete, MoreVert,
  QuizOutlined, CheckCircle, Block,
} from '@mui/icons-material';
import { DataTable } from '../../components/tables';
import { DeleteDialog, ConfirmDialog } from '../../components/dialogs';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/feedback';
import PageHeader from '../../components/PageHeader';

const MOCK_QUESTIONS = Array.from({ length: 50 }, (_, i) => ({
  id: `Q${String(i + 1).padStart(4, '0')}`,
  question: i % 3 === 0
    ? `Which of the following best describes the concept of object-oriented programming?`
    : i % 3 === 1
    ? `What is the time complexity of binary search in a sorted array?`
    : `Explain the difference between TCP and UDP protocols.`,
  subject: ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks'][i % 5],
  category: ['Conceptual', 'Analytical', 'Applied', 'Theoretical'][i % 4],
  difficulty: ['Easy', 'Medium', 'Hard', 'Expert'][i % 4],
  marks: [1, 2, 5, 10][i % 4],
  type: ['MCQ', 'True/False', 'Short Answer', 'Coding', 'Essay'][i % 5],
  createdBy: `Dr. ${['Sharma', 'Patel', 'Verma', 'Gupta', 'Singh'][i % 5]}`,
  lastUpdated: new Date(Date.now() - i * 86400000).toLocaleDateString(),
  status: i % 7 === 0 ? 'Archived' : 'Active',
}));

const difficultyColors = { Easy: 'success', Medium: 'warning', Hard: 'error', Expert: 'secondary' };

const QuestionBank = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [rowSelectionModel, setRowSelectionModel] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionQuestion, setActionQuestion] = useState(null);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const filteredQuestions = useMemo(() => {
    return MOCK_QUESTIONS.filter((q) => {
      if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !q.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterSubject !== 'all' && q.subject !== filterSubject) return false;
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
      if (filterType !== 'all' && q.type !== filterType) return false;
      if (filterStatus !== 'all' && q.status !== filterStatus) return false;
      return true;
    });
  }, [searchQuery, filterSubject, filterDifficulty, filterType, filterStatus]);

  const columns = useMemo(() => [
    {
      field: 'id', headerName: 'ID', width: 90,
    },
    {
      field: 'question',
      headerName: 'Question',
      flex: 2,
      minWidth: 250,
      renderCell: (params) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'subject',
      headerName: 'Subject',
      width: 140,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120,
    },
    {
      field: 'difficulty',
      headerName: 'Difficulty',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color={difficultyColors[params.value] || 'default'} sx={{ fontWeight: 500, minWidth: 60 }} />
      ),
    },
    {
      field: 'marks',
      headerName: 'Marks',
      width: 80,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 110,
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      width: 130,
    },
    {
      field: 'lastUpdated',
      headerName: 'Last Updated',
      width: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Active' ? 'success' : 'secondary'}
          variant="filled"
          sx={{ fontWeight: 500, minWidth: 70 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="Actions">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setActionQuestion(params.row);
              setActionMenuAnchor(e.currentTarget);
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  const subjects = useMemo(() => [...new Set(MOCK_QUESTIONS.map(q => q.subject))], []);
  const difficulties = useMemo(() => ['Easy', 'Medium', 'Hard', 'Expert'], []);
  const types = useMemo(() => [...new Set(MOCK_QUESTIONS.map(q => q.type))], []);

  const handleDelete = useCallback(async () => {
    console.log('Delete:', selectedQuestion || rowSelectionModel);
    setDeleteDialogOpen(false);
    setSelectedQuestion(null);
  }, [selectedQuestion, rowSelectionModel]);

  const handleArchive = useCallback(async () => {
    console.log('Archive:', selectedQuestion || rowSelectionModel);
    setArchiveDialogOpen(false);
    setSelectedQuestion(null);
  }, [selectedQuestion, rowSelectionModel]);

  return (
    <Box>
      <PageHeader
        title="Question Bank"
        subtitle="Manage and organize your question repository"
        action={
          <>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Export
            </Button>
            <Button variant="contained" startIcon={<Add />}>
              Add Question
            </Button>
          </>
        }
        breadcrumbs={[
          { label: 'Faculty' },
          { label: 'Question Bank' },
        ]}
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select value={filterSubject} label="Subject" onChange={(e) => setFilterSubject(e.target.value)}>
                  <MenuItem value="all">All Subjects</MenuItem>
                  {subjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Difficulty</InputLabel>
                <Select value={filterDifficulty} label="Difficulty" onChange={(e) => setFilterDifficulty(e.target.value)}>
                  <MenuItem value="all">All Difficulties</MenuItem>
                  {difficulties.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={filterType} label="Type" onChange={(e) => setFilterType(e.target.value)}>
                  <MenuItem value="all">All Types</MenuItem>
                  {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3} md={1}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
              <Stack direction="row" spacing={1}>
                {(filterSubject !== 'all' || filterDifficulty !== 'all' || filterType !== 'all' || filterStatus !== 'all' || searchQuery) && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterSubject('all');
                      setFilterDifficulty('all');
                      setFilterType('all');
                      setFilterStatus('all');
                    }}
                  >
                    Clear
                  </Button>
                )}
                {rowSelectionModel.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {rowSelectionModel.length} selected
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete
                    </Button>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={8} cols={8} />
      ) : error ? (
        <ErrorState message="Failed to load questions" onRetry={handleRetry} />
      ) : filteredQuestions.length === 0 ? (
        <EmptyState
          title="No questions found"
          message={searchQuery ? 'Try a different search term.' : 'Add your first question to get started.'}
          actionLabel={searchQuery ? undefined : 'Add Question'}
          onAction={searchQuery ? undefined : () => {}}
        />
      ) : (
        <DataTable
          rows={filteredQuestions}
          columns={columns}
          checkboxSelection
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={(newModel) => setRowSelectionModel(newModel)}
          getRowId={(row) => row.id}
        />
      )}

      {/* Row Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { setActionMenuAnchor(null); }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setActionMenuAnchor(null); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setActionMenuAnchor(null); }}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setActionMenuAnchor(null); setSelectedQuestion(actionQuestion); setArchiveDialogOpen(true); }}>
          <ListItemIcon><Archive fontSize="small" /></ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setActionMenuAnchor(null); setSelectedQuestion(actionQuestion); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedQuestion(null); }}
        onConfirm={handleDelete}
        title="Delete Question"
        message="Are you sure you want to delete this question? This action cannot be undone."
        itemName={selectedQuestion?.question}
      />

      <ConfirmDialog
        open={archiveDialogOpen}
        onClose={() => { setArchiveDialogOpen(false); setSelectedQuestion(null); }}
        onConfirm={handleArchive}
        title="Archive Question"
        message="This question will be archived and hidden from active exams. You can restore it later."
        confirmLabel="Archive"
        itemName={selectedQuestion?.question}
      />
    </Box>
  );
};

export default QuestionBank;
