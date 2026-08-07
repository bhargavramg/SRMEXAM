import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Grid, Typography, Button, Chip, IconButton, Tooltip,
  TextField, Select, MenuItem, FormControl, InputLabel, InputAdornment,
  Stack, Menu, ListItemIcon, ListItemText, Divider, Card, CardContent,
} from '@mui/material';
import {
  Add, Search, CloudUpload, CloudDownload,
  Visibility, Edit, ContentCopy, Archive, Delete, MoreVert,
  Description
} from '@mui/icons-material';
import { DataTable } from '../../components/tables';
import { DeleteDialog, ConfirmDialog } from '../../components/dialogs';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/feedback';
import PageHeader from '../../components/PageHeader';
import { useQueryClient } from '@tanstack/react-query';
import facultyApi from '../../api/facultyApi';
import QuestionImportDialog from './QuestionImportDialog';
import * as XLSX from 'xlsx';

const difficultyColors = { EASY: 'success', MEDIUM: 'warning', HARD: 'error' };

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [rowSelectionModel, setRowSelectionModel] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionQuestion, setActionQuestion] = useState(null);
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await facultyApi.getQuestions();
      setQuestions(data);
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['myQuestions'] });
      }
    } catch (err) {
      console.error("fetchQuestions error:", err);
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery && !q.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterSubject !== 'all' && q.bank?.subject?.name !== filterSubject) return false;
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
      return true;
    });
  }, [questions, searchQuery, filterSubject, filterDifficulty]);

  const columns = useMemo(() => [
    {
      field: 'id', headerName: 'ID', width: 90,
      renderCell: (params) => <Typography variant="caption">{params.value.substring(0, 8)}</Typography>
    },
    {
      field: 'text',
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
        <Chip label={params.row.bank?.subject?.name || 'N/A'} size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120,
      renderCell: (params) => params.row.category?.name || 'General'
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
      field: 'createdAt',
      headerName: 'Created Date',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString()
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

  const subjects = useMemo(() => [...new Set(questions.map(q => q.bank?.subject?.name).filter(Boolean))], [questions]);
  const difficulties = useMemo(() => ['EASY', 'MEDIUM', 'HARD'], []);

  const handleDelete = useCallback(async () => {
    try {
      if (selectedQuestion) {
        await facultyApi.deleteQuestion(selectedQuestion.id);
      } else {
        // Bulk delete logic could go here if implemented in API
      }
      fetchQuestions();
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
    }
  }, [selectedQuestion, fetchQuestions]);

  const handleArchive = useCallback(async () => {
    // Implement archive logic
    setArchiveDialogOpen(false);
    setSelectedQuestion(null);
  }, [selectedQuestion, rowSelectionModel]);

  const handleExport = () => {
    if (filteredQuestions.length === 0) return;
    
    const exportData = filteredQuestions.map(q => {
      const correctIndex = q.options.findIndex(opt => opt.isCorrect);
      const correctChar = ['A', 'B', 'C', 'D'][correctIndex] || 'A';
      
      return {
        'Question': q.text,
        'Option A': q.options[0]?.text || '',
        'Option B': q.options[1]?.text || '',
        'Option C': q.options[2]?.text || '',
        'Option D': q.options[3]?.text || '',
        'Correct Answer': correctChar,
        'Marks': q.marks,
        'Difficulty': q.difficulty === 'EASY' ? 'Easy' : (q.difficulty === 'HARD' ? 'Hard' : 'Medium'),
        'Category': q.category?.name || 'General'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    XLSX.writeFile(workbook, 'Question_Bank_Hackers_Mind.xlsx');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Question': 'SQL stands for?',
        'Option A': 'Structured Query Language',
        'Option B': 'Simple Query Language',
        'Option C': 'Sequential Query Language',
        'Option D': 'None',
        'Correct Answer': 'A',
        'Marks': 2,
        'Difficulty': 'Easy',
        'Category': 'SQL'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Question_Template.xlsx');
  };

  return (
    <Box>
      <PageHeader
        title="Question Bank"
        subtitle="Manage and organize your question repository"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Description />}
              onClick={handleDownloadTemplate}
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              Download Template
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={handleExport}
              disabled={filteredQuestions.length === 0}
            >
              Export
            </Button>
            <Button variant="contained" startIcon={<Add />}>
              Add Question
            </Button>
          </Stack>
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
            <Grid item xs={12} sm={4} md={4}>
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
            <Grid item xs={6} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select value={filterSubject} label="Subject" onChange={(e) => setFilterSubject(e.target.value)}>
                  <MenuItem value="all">All Subjects</MenuItem>
                  {subjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Difficulty</InputLabel>
                <Select value={filterDifficulty} label="Difficulty" onChange={(e) => setFilterDifficulty(e.target.value)}>
                  <MenuItem value="all">All Difficulties</MenuItem>
                  {difficulties.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
              <Stack direction="row" spacing={1}>
                {(filterSubject !== 'all' || filterDifficulty !== 'all' || searchQuery) && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterSubject('all');
                      setFilterDifficulty('all');
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
        <LoadingSkeleton type="table" rows={8} cols={7} />
      ) : error ? (
        <ErrorState message="Failed to load questions" onRetry={fetchQuestions} />
      ) : filteredQuestions.length === 0 ? (
        <EmptyState
          title="No questions found."
          message={searchQuery ? 'Try a different search term.' : 'Import an Excel file or create a question manually.'}
          actionLabel={searchQuery ? undefined : 'Import Questions'}
          onAction={searchQuery ? undefined : () => setImportDialogOpen(true)}
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
        itemName={selectedQuestion?.text}
      />

      <ConfirmDialog
        open={archiveDialogOpen}
        onClose={() => { setArchiveDialogOpen(false); setSelectedQuestion(null); }}
        onConfirm={handleArchive}
        title="Archive Question"
        message="This question will be archived and hidden from active exams. You can restore it later."
        confirmLabel="Archive"
        itemName={selectedQuestion?.text}
      />

      <QuestionImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => fetchQuestions()}
      />
    </Box>
  );
};

export default QuestionBank;
