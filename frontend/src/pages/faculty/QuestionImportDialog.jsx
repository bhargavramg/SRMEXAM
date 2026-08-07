import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Alert, LinearProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  IconButton, Tooltip, Stack, Divider
} from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon, Close } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import facultyApi from '../../api/facultyApi';

const REQUIRED_COLUMNS = [
  'Question', 'Option A', 'Option B', 'Option C', 'Option D',
  'Correct Answer', 'Marks', 'Difficulty'
];

const QuestionImportDialog = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [globalError, setGlobalError] = useState('');
  
  // Category Selection
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const fileInputRef = useRef();

  React.useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await facultyApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setIsImporting(false);
    setImportResult(null);
    setGlobalError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateRow = (row, index) => {
    const rowNum = index + 2;
    const errors = [];
    let isValid = true;

    // Check required fields
    const requiredFields = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks'];
    requiredFields.forEach(field => {
      if (row[field] === undefined || row[field] === null || String(row[field]).trim() === '') {
        errors.push(`Missing ${field}`);
        isValid = false;
      }
    });

    if (!isValid) return { isValid, errors, rowNum };

    // Validate Correct Answer
    const validAnswers = ['A', 'B', 'C', 'D'];
    if (!validAnswers.includes(String(row['Correct Answer']).trim().toUpperCase())) {
      errors.push('Correct Answer must be A, B, C, or D');
      isValid = false;
    }

    // Validate Marks
    const marks = parseFloat(row.Marks);
    if (isNaN(marks) || marks <= 0) {
      errors.push('Marks must be a number > 0');
      isValid = false;
    }

    // Default difficulty if missing
    if (!row.Difficulty || String(row.Difficulty).trim() === '') {
      row.Difficulty = 'Medium';
    } else {
      const diff = String(row.Difficulty).trim();
      if (!['Easy', 'Medium', 'Hard'].includes(diff)) {
        errors.push('Difficulty must be Easy, Medium, or Hard');
        isValid = false;
      }
    }

    return { isValid, errors, rowNum };
  };

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const fileType = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileType)) {
      setGlobalError('Please upload a valid Excel or CSV file.');
      return;
    }

    setFile(selectedFile);
    setGlobalError('');
    setImportResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          setGlobalError('The uploaded file is empty.');
          return;
        }

        // Validate Headers
        const headers = Object.keys(jsonData[0]);
        const missingHeaders = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        
        if (missingHeaders.length > 0) {
          setGlobalError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        // Validate Rows
        const parsedData = [];
        const allErrors = [];
        
        jsonData.forEach((row, index) => {
          // Skip completely empty rows
          if (Object.values(row).every(v => v === '')) return;
          
          const validation = validateRow(row, index);
          if (!validation.isValid) {
            allErrors.push({ row: validation.rowNum, errors: validation.errors });
          }
          parsedData.push({ ...row, _isValid: validation.isValid, _errors: validation.errors });
        });

        setPreviewData(parsedData);
        setValidationErrors(allErrors);
      } catch (err) {
        console.error('File parsing error:', err);
        setGlobalError('Failed to parse the file. Please ensure it is a valid Excel format.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    const validQuestions = previewData.filter(row => row._isValid).map(row => {
      // Remove internal state before sending
      const { _isValid, _errors, ...cleanRow } = row;
      return cleanRow;
    });

    if (validQuestions.length === 0) {
      setGlobalError('No valid questions to import.');
      return;
    }

    if (!selectedCategory) {
      setGlobalError('Please select a category for these questions.');
      return;
    }

    setIsImporting(true);
    setGlobalError('');
    
    try {
      const response = await facultyApi.importQuestions({
        categoryId: selectedCategory,
        questions: validQuestions
      });
      setImportResult(response);
      if (response.success && response.imported > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Import API error:', error);
      const errorMessage = error.error || error.message || (typeof error === 'string' ? error : 'Failed to import questions. Please try again.');
      setGlobalError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = previewData.filter(r => r._isValid).length;
  const invalidCount = previewData.length - validCount;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Import Questions</Typography>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {!file && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Upload Question Bank</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Supported formats: .xlsx, .xls, .csv
            </Typography>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button variant="contained" onClick={() => fileInputRef.current?.click()}>
              Select File
            </Button>
          </Box>
        )}

        {file && !importResult && !isImporting && previewData.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Category for Import:</Typography>
            <select 
              style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: '4px', borderColor: '#ccc' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">-- Select a Category --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categories.length === 0 && !loadingCategories && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                No categories found. Please create a category first.
              </Typography>
            )}
          </Box>
        )}

        {globalError && (
          <Alert severity="error" sx={{ mb: 3 }}>{globalError}</Alert>
        )}

        {isImporting && (
          <Box sx={{ my: 3 }}>
            <Typography variant="body2" gutterBottom>Importing questions...</Typography>
            <LinearProgress />
          </Box>
        )}

        {importResult && (
          <Box sx={{ mb: 3 }}>
            <Alert severity={importResult.success && importResult.imported > 0 ? "success" : "warning"} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Import Completed</Typography>
              <Typography variant="body2">{importResult.imported} Questions successfully imported.</Typography>
              {importResult.failed > 0 && (
                <Typography variant="body2" color="error.main">{importResult.failed} Questions failed or skipped (e.g. duplicates).</Typography>
              )}
            </Alert>
            
            {importResult.errors && importResult.errors.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto', bgcolor: 'error.lighter' }}>
                <Typography variant="subtitle2" color="error" gutterBottom>Server Validation Errors:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>
                      <Typography variant="body2" color="error">Row {e.row}: {e.message}</Typography>
                    </li>
                  ))}
                </ul>
              </Paper>
            )}
          </Box>
        )}

        {file && !importResult && !isImporting && previewData.length > 0 && (
          <Box>
            <Stack direction="row" spacing={3} sx={{ mb: 2 }} alignItems="center">
              <Typography variant="subtitle2">File: {file.name}</Typography>
              <Chip label={`Total: ${previewData.length}`} size="small" />
              <Chip label={`Valid: ${validCount}`} color="success" size="small" />
              {invalidCount > 0 && (
                <Chip label={`Invalid: ${invalidCount}`} color="error" size="small" />
              )}
            </Stack>

            {validationErrors.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {validationErrors.length} invalid rows. They will be skipped during import.
              </Alert>
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="50">Status</TableCell>
                    <TableCell width="60">Row</TableCell>
                    <TableCell>Question</TableCell>
                    <TableCell width="80">Correct</TableCell>
                    <TableCell width="80">Marks</TableCell>
                    <TableCell width="120">Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx} sx={{ bgcolor: row._isValid ? 'inherit' : 'error.lighter' }}>
                      <TableCell>
                        {row._isValid ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <Tooltip title={row._errors.join(', ')}>
                            <ErrorIcon color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>{idx + 2}</TableCell>
                      <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.Question}
                      </TableCell>
                      <TableCell>{row['Correct Answer']}</TableCell>
                      <TableCell>{row.Marks}</TableCell>
                      <TableCell>{row.Category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {previewData.length > 100 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                Showing first 100 rows.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={handleClose} disabled={isImporting}>
          {importResult ? 'Close' : 'Cancel'}
        </Button>
        <Stack direction="row" spacing={2}>
          {file && !importResult && (
            <Button variant="outlined" onClick={resetState} disabled={isImporting}>
              Choose Different File
            </Button>
          )}
          {file && !importResult && (
            <Button 
              variant="contained" 
              onClick={handleImport}
              disabled={isImporting || validCount === 0}
              startIcon={<CloudUpload />}
            >
              Import {validCount} Valid Questions
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionImportDialog;
