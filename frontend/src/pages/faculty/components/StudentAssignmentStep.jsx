import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, Stack, CircularProgress } from '@mui/material';
import { DataTable } from '../../../components/tables';
import facultyApi from '../../../api/facultyApi';
import { useQuery } from '@tanstack/react-query';

const StudentAssignmentStep = ({ assignmentId, selectedStudents, setSelectedStudents }) => {
  const { data: students = [], isLoading: loading, error } = useQuery({
    queryKey: ['assignmentStudents', assignmentId],
    queryFn: () => facultyApi.getAssignmentStudents(assignmentId),
    enabled: !!assignmentId,
  });

  const [initializedId, setInitializedId] = useState(null);

  useEffect(() => {
    // Only auto-select once per assignment ID when data loads to prevent infinite auto-selection
    if (students.length > 0 && initializedId !== assignmentId) {
      if (selectedStudents.length === 0) {
        setSelectedStudents(students);
      }
      setInitializedId(assignmentId);
    }
  }, [students, assignmentId, initializedId, selectedStudents.length, setSelectedStudents]);

  const handleSelectionChange = (ids) => {
    // Use Set for O(1) lookup performance to prevent duplicate selections
    const idSet = new Set(ids);
    const selected = students.filter(s => idSet.has(s.id));
    setSelectedStudents(selected);
  };

  const selectAll = () => setSelectedStudents(students);
  const clearAll = () => setSelectedStudents([]);

  if (!assignmentId) {
    return <Alert severity="warning">Please select a Faculty Assignment in the Exam Details step first.</Alert>;
  }

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message || 'Failed to load students'}</Alert>;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Select the students who are allowed to write this exam. Only selected students will see this exam in their portal.
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
        <Box>
          <Typography variant="h6">Selected Students</Typography>
          <Typography variant="body2" color="text.secondary">
            Total Students: {students.length} | Selected: {selectedStudents.length} | Remaining: {students.length - selectedStudents.length}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={selectAll}>Select All</Button>
          <Button variant="outlined" size="small" color="error" onClick={clearAll}>Clear All</Button>
        </Stack>
      </Box>

      {selectedStudents.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✓ Ready for Publish. {selectedStudents.length} students assigned.
        </Alert>
      )}

      <DataTable
        rows={students}
        columns={[
          { field: 'register_no', headerName: 'Register No', width: 150 },
          { field: 'name', headerName: 'Name', flex: 1 },
          { field: 'email', headerName: 'Email', flex: 1 },
        ]}
        checkboxSelection
        rowSelectionModel={selectedStudents.map(s => s.id)}
        onRowSelectionChange={handleSelectionChange}
        getRowId={(row) => row.id}
        height={500}
        pageSize={50}
        pageSizeOptions={[10, 25, 50, 100, 500]}
      />
    </Box>
  );
};

export default StudentAssignmentStep;
