import React, { useState, useCallback } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  Typography, Box, LinearProgress 
} from '@mui/material';
import { UploadFile, FileDownload } from '@mui/icons-material';
import * as XLSX from 'xlsx';

const ImportStudentsModal = ({ open, onClose, onImport, isLoading }) => {
  const [parsedData, setParsedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        const normalized = jsonData.map(row => {
          const keys = Object.keys(row);
          const findKey = (patterns) => keys.find(k =>
            patterns.some(p => k.toLowerCase().replace(/[_\s]/g, '').includes(p))
          );
          return {
            register_no: String(row[findKey(['registerno', 'registernum', 'regnumber', 'regno', 'register'])] || '').trim(),
            name: String(row[findKey(['studentname', 'name', 'fullname'])] || '').trim(),
            email: String(row[findKey(['email', 'emailaddress', 'emailid'])] || '').trim(),
            password: String(row[findKey(['password', 'pwd', 'pass'])] || '').trim(),
          };
        }).filter(r => r.name || r.email || r.register_no);

        setParsedData(normalized);
      } catch (err) {
        setError('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Register Number": "RA231103001001", "Student Name": "Rahul Kumar", "Email": "rahul@srmist.edu.in" },
      { "Register Number": "RA231103001002", "Student Name": "Priya Sharma", "Email": "priya@srmist.edu.in" },
      { "Register Number": "RA231103001003", "Student Name": "Arjun Reddy", "Email": "arjun@srmist.edu.in" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;
    onImport(parsedData);
  };

  const resetState = () => {
    setParsedData([]);
    setFileName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={resetState} maxWidth="sm" fullWidth>
      <DialogTitle>Import Students</DialogTitle>
      <DialogContent>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<FileDownload />} 
            onClick={handleDownloadTemplate}
          >
            📥 Download Sample Excel
          </Button>
        </Box>
        
        <Box sx={{ p: 3, mt: 1, border: '2px dashed #ccc', borderRadius: 2, textAlign: 'center', bgcolor: '#fafafa', cursor: 'pointer' }} component="label">
          <UploadFile sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6">Click to Upload Excel or CSV</Typography>
          <Typography variant="body2" color="text.secondary">or drag and drop file here</Typography>
          <input type="file" hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
        </Box>

        {fileName && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'primary.main', fontWeight: 600 }}>
            Selected File: {fileName} ({parsedData.length} records found)
          </Typography>
        )}
        
        {error && <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>{error}</Typography>}


      </DialogContent>
      <DialogActions>
        <Button onClick={resetState} disabled={isLoading}>Cancel</Button>
        <Button variant="contained" onClick={handleImport} disabled={parsedData.length === 0 || isLoading}>
          Import {parsedData.length > 0 ? parsedData.length : ''} Students
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportStudentsModal;
