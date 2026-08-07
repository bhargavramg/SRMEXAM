import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, FormControl, InputLabel,
  Select, MenuItem, Typography, Box, Alert, IconButton,
  List, ListItem, ListItemText, Divider, Paper
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

export const AddEditStudentDialog = ({ open, onClose, onSave, student, assignments }) => {
  const isHybrid = assignments.length > 1;
  const singleAssignment = assignments.length === 1 ? assignments[0] : null;
  const initialAssignmentId = singleAssignment ? singleAssignment.id : '';

  const [formData, setFormData] = useState(student || {
    name: '', registerNo: '', email: '', phone: '', assignmentId: initialAssignmentId, status: 'ACTIVE'
  });
  const [error, setError] = useState('');

  const isEdit = !!student;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEdit && !formData.assignmentId && isHybrid) {
      setError('Please select a subject/section to assign the student to.');
      return;
    }
    setError('');
    // Ensure assignmentId is set for single assignment even if not touched
    const finalData = { ...formData };
    if (!isEdit && !isHybrid && singleAssignment) {
      finalData.assignmentId = singleAssignment.id;
    }
    onSave(finalData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit ? 'Edit Student' : 'Add New Student'}
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Student Name" name="name"
                value={formData.name} onChange={handleChange} required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Register Number" name="registerNo"
                value={formData.registerNo || formData.register_no} onChange={handleChange} required
                disabled={isEdit}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Email Address" name="email" type="email"
                value={formData.email} onChange={handleChange} required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Phone Number" name="phone"
                value={formData.phone || ''} onChange={handleChange}
              />
            </Grid>
            
            {!isEdit && (
              <>
                <Grid item xs={12}>
                  {isHybrid ? (
                    <FormControl fullWidth required>
                      <InputLabel>Assign To Subject/Section</InputLabel>
                      <Select
                        name="assignmentId"
                        value={formData.assignmentId}
                        label="Assign To Subject/Section"
                        onChange={handleChange}
                      >
                        {assignments.map(a => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.subject?.name || 'Unknown'} ({a.assessmentType?.name} - {a.academicYear?.name})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : singleAssignment ? (
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" color="text.secondary">Automatically Assigned To</Typography>
                      <Typography variant="body1">
                        <strong>Subject:</strong> {singleAssignment.subject?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Assessment: {singleAssignment.assessmentType?.name} | Year: {singleAssignment.academicYear?.name}
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="error">No active assignments found.</Alert>
                  )}
                </Grid>
              </>
            )}

            {isEdit && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleChange}
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export const ResetPasswordDialog = ({ open, onClose, onSave, student }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reset Password for {student?.name}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1">
          Are you sure you want to reset the password for <strong>{student?.name}</strong> ({student?.register_no})?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Their password will be reset to their Register Number. They will be required to change it upon their next login.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave()} variant="contained" color="warning">Reset Password</Button>
      </DialogActions>
    </Dialog>
  );
};

export const ImportStudentDialog = ({ open, onClose, onImport, assignments }) => {
  const isHybrid = assignments.length > 1;
  const singleAssignment = assignments.length === 1 ? assignments[0] : null;

  const [file, setFile] = useState(null);
  const [assignmentId, setAssignmentId] = useState(singleAssignment ? singleAssignment.id : '');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, duplicates: 0, failed: 0, failedReasons: [] });

  const handleDownloadTemplate = () => {
    const wsData = [
      ['Register Number', 'Student Name', 'Email'],
      ['RA231103001001', 'Rahul Kumar', 'rahul@srmist.edu.in'],
      ['RA231103001002', 'Priya Sharma', 'priya@srmist.edu.in'],
      ['RA231103001003', 'Arjun Reddy', 'arjun@srmist.edu.in'],
      ['RA231103001004', 'Sneha Patel', 'sneha@srmist.edu.in'],
      ['RA231103001005', 'Karthik S', 'karthik@srmist.edu.in']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Student_Import_Template.xlsx');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const mapped = [];
          data.forEach(row => {
            const name = row['Student Name'] || row['Name'] || row.name || '';
            const registerNo = row['Register Number'] || row['Reg No'] || row.registerNo || '';
            const email = row['Email'] || row.email || '';
            
            // Ignore empty rows
            if (!name && !registerNo && !email) return;
            
            mapped.push({ name: String(name).trim(), registerNo: String(registerNo).trim(), email: String(email).trim() });
          });

          // Compute stats
          let validCount = 0;
          let duplicateCount = 0;
          let failedCount = 0;
          let seenRegNos = new Set();
          let seenEmails = new Set();
          let failedReasons = [];
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          mapped.forEach((row, index) => {
            let rowErrors = [];
            if (!row.registerNo) rowErrors.push('Missing Register Number');
            if (!row.name) rowErrors.push('Missing Student Name');
            if (!row.email) rowErrors.push('Missing Email');
            else if (!emailRegex.test(row.email)) rowErrors.push('Invalid Email Format');

            if (row.registerNo && seenRegNos.has(row.registerNo)) {
              rowErrors.push('Duplicate Register Number');
            }
            if (row.email && seenEmails.has(row.email)) {
              rowErrors.push('Duplicate Email');
            }

            if (rowErrors.length > 0) {
              failedCount++;
              failedReasons.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
              // Track values even if failed to ensure we don't count duplicate again across failed rows
              if (row.registerNo) seenRegNos.add(row.registerNo);
              if (row.email) seenEmails.add(row.email);
            } else {
              seenRegNos.add(row.registerNo);
              seenEmails.add(row.email);
              validCount++;
            }
          });

          setStats({
            total: mapped.length,
            valid: validCount,
            duplicates: duplicateCount,
            failed: failedCount,
            failedReasons
          });

          setPreview(mapped);
          setError('');
        } catch (err) {
          setError('Failed to read file. Please ensure it is a valid Excel or CSV file.');
          setStats({ total: 0, valid: 0, duplicates: 0, failed: 0, failedReasons: [] });
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleImport = () => {
    if (isHybrid && !assignmentId) {
      setError('Please select a subject/section to assign the imported students to.');
      return;
    }
    if (preview.length === 0) {
      setError('No students found in the file.');
      return;
    }
    const finalAssignmentId = isHybrid ? assignmentId : singleAssignment.id;
    onImport({ students: preview, assignmentId: finalAssignmentId });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Students</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {isHybrid ? (
          <FormControl fullWidth sx={{ mb: 3 }} required>
            <InputLabel>Assign To Subject/Section</InputLabel>
            <Select
              value={assignmentId}
              label="Assign To Subject/Section"
              onChange={e => setAssignmentId(e.target.value)}
            >
              {assignments.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.subject?.name || 'Unknown'} ({a.assessmentType?.name} - {a.academicYear?.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : singleAssignment ? (
          <Box sx={{ p: 2, mb: 3, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>Target Assignment</Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}><Typography variant="body2"><strong>Faculty:</strong> {singleAssignment.faculty?.name || 'Logged-in Faculty'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>Subject:</strong> {singleAssignment.subject?.name || 'Unknown'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>Assessment:</strong> {singleAssignment?.assessmentType?.name || 'Unknown'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>Year:</strong> {singleAssignment?.academicYear?.name || 'Unknown'}</Typography></Grid>
            </Grid>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              Imported students will automatically be assigned here.
            </Typography>
          </Box>
        ) : (
          <Alert severity="error" sx={{ mb: 3 }}>
            You have no active subject assignments. You must be assigned to a subject before you can import students.
          </Alert>
        )}

        <Box sx={{ display: 'flex', mb: 2 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate}>
            Download Sample Excel
          </Button>
        </Box>

        <Box sx={{ border: '2px dashed #ccc', p: 3, textAlign: 'center', borderRadius: 2, mb: 2 }}>
          <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            Upload Excel or CSV file
          </Typography>
          <Button variant="contained" component="label" sx={{ mt: 1 }}>
            Choose File
            <input type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
          </Button>
          {file && <Typography variant="caption" display="block" sx={{ mt: 1 }}>{file.name}</Typography>}
        </Box>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">Expected Excel Format</Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 1.5 }}>
            <li>✓ Register Number (Required)</li>
            <li>✓ Student Name (Required)</li>
            <li>✓ Email (Required)</li>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Password will be automatically set as the Register Number.<br/>
            Students will be forced to change it on first login.
          </Typography>
        </Box>
        
        {preview.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Parsed <strong>{stats.total}</strong> total rows from file.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="h6">{stats.valid}</Typography>
                  <Typography variant="caption">Valid</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="h6">{stats.duplicates}</Typography>
                  <Typography variant="caption">Duplicates</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="h6">{stats.failed}</Typography>
                  <Typography variant="caption">Failed</Typography>
                </Paper>
              </Grid>
            </Grid>
            {stats.failedReasons.length > 0 && (
              <Box sx={{ mt: 2, maxHeight: 100, overflowY: 'auto', bgcolor: '#ffebee', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" color="error">
                  {stats.failedReasons.map((r, i) => <div key={i}>{r}</div>)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} variant="contained" color="primary" disabled={preview.length === 0 || (!isHybrid && !singleAssignment) || (isHybrid && !assignmentId)}>
          Start Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ViewStudentDialog = ({ open, onClose, student }) => {
  if (!student) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Student Details
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>Personal Information</Typography>
        <List dense>
          <ListItem><ListItemText primary="Name" secondary={student.name} /></ListItem>
          <ListItem><ListItemText primary="Register Number" secondary={student.register_no} /></ListItem>
          <ListItem><ListItemText primary="Email" secondary={student.email} /></ListItem>
          <ListItem><ListItemText primary="Phone" secondary={student.phone || 'N/A'} /></ListItem>
        </List>
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>Academic Information</Typography>
        {student.enrollment ? (
          <List dense>
            <ListItem><ListItemText primary="Course" secondary={student.enrollment.course?.name || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Department" secondary={student.enrollment.course?.department?.name || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Semester" secondary={student.enrollment.semester?.number || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Section" secondary={student.enrollment.section?.name || 'N/A'} /></ListItem>
            {student.subject && (
              <ListItem><ListItemText primary="Assigned Subject" secondary={student.subject?.name} /></ListItem>
            )}
          </List>
        ) : (
          <Typography color="text.secondary">No enrollment info</Typography>
        )}
        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>System Information</Typography>
        <List dense>
          <ListItem><ListItemText primary="Account Status" secondary={student.status} /></ListItem>
          <ListItem><ListItemText primary="Created Date" secondary={new Date(student.createdAt).toLocaleString()} /></ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
