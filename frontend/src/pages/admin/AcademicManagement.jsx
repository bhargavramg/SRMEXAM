import React, { useState } from 'react';
import { Box, Card, CardContent, Tabs, Tab, Typography, CircularProgress, Button } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/tables';
import { useQuery } from '@tanstack/react-query';
import adminApi from '../../api/adminApi';
import { Add } from '@mui/icons-material';
import AddSectionModal from './components/AddSectionModal';

const TabPanel = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

const AcademicManagement = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);

  const { data: departments = [], isLoading: isLoadingDept } = useQuery({
    queryKey: ['adminDepartments'],
    queryFn: () => adminApi.getDepartments(),
    enabled: tabIndex === 0
  });

  const { data: courses = [], isLoading: isLoadingCourse } = useQuery({
    queryKey: ['adminCourses'],
    queryFn: () => adminApi.getCourses(),
    enabled: tabIndex === 1
  });

  const { data: years = [], isLoading: isLoadingYears } = useQuery({
    queryKey: ['adminYears'],
    queryFn: () => adminApi.getAcademicYears(),
    enabled: tabIndex === 2
  });

  const { data: semesters = [], isLoading: isLoadingSemesters } = useQuery({
    queryKey: ['adminSemesters'],
    queryFn: () => adminApi.getSemesters(),
    enabled: tabIndex === 3
  });

  const { data: sections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['adminSections'],
    queryFn: () => adminApi.getSections(),
    enabled: tabIndex === 4
  });

  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['adminSubjects'],
    queryFn: () => adminApi.getSubjects(),
    enabled: tabIndex === 5
  });

  const { data: assessmentTypes = [], isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['adminAssessmentTypes'],
    queryFn: () => adminApi.getAssessmentTypes(),
    enabled: tabIndex === 6
  });

  const deptColumns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'code', headerName: 'Code', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'createdAt', headerName: 'Created', width: 200, renderCell: ({ row }) => new Date(row.createdAt).toLocaleDateString() },
  ];

  const courseColumns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'code', headerName: 'Code', width: 150 },
    { field: 'department', headerName: 'Department', width: 200, renderCell: ({ row }) => row.department?.name },
    { field: 'duration', headerName: 'Duration (Yrs)', width: 120 },
  ];

  const yearColumns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'startDate', headerName: 'Start Date', width: 200, renderCell: ({ row }) => new Date(row.startDate).toLocaleDateString() },
    { field: 'endDate', headerName: 'End Date', width: 200, renderCell: ({ row }) => new Date(row.endDate).toLocaleDateString() },
    { field: 'isCurrent', headerName: 'Current', width: 120, renderCell: ({ row }) => row.isCurrent ? 'Yes' : 'No' },
  ];

  const semColumns = [
    { field: 'course', headerName: 'Course', flex: 1, renderCell: ({ row }) => row.course?.name },
    { field: 'academicYear', headerName: 'Academic Year', width: 150, renderCell: ({ row }) => row.academicYear?.name },
    { field: 'semesterNumber', headerName: 'Semester No.', width: 150 },
  ];

  const secColumns = [
    { field: 'name', headerName: 'Section', width: 150 },
    { field: 'semester', headerName: 'Semester', flex: 1, renderCell: ({ row }) => `Sem ${row.semester?.semesterNumber} - ${row.semester?.course?.name}` },
    { field: 'capacity', headerName: 'Capacity', width: 120 },
  ];

  const subColumns = [
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'name', headerName: 'Subject Name', flex: 1 },
    { field: 'department', headerName: 'Department', width: 200, renderCell: ({ row }) => row.department?.name },
    { field: 'semester', headerName: 'Semester', width: 200, renderCell: ({ row }) => `Sem ${row.semester?.semesterNumber} - ${row.semester?.course?.name}` },
    { field: 'credits', headerName: 'Credits', width: 100 },
  ];

  const assessmentColumns = [
    { field: 'name', headerName: 'Name', flex: 1 }, // e.g. "FT1", "Quiz"
    { field: 'description', headerName: 'Description', flex: 2 },
    { field: 'weightage', headerName: 'Weightage (%)', width: 150 },
  ];

  return (
    <Box>
      <PageHeader title="Academic Setup" subtitle="Manage university hierarchy: Departments, Courses, Semesters, Sections, and Subjects" />
      
      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Departments" />
            <Tab label="Courses" />
            <Tab label="Academic Years" />
            <Tab label="Semesters" />
            <Tab label="Sections" />
            <Tab label="Subjects" />
            <Tab label="Assessment Types" />
          </Tabs>
        </Box>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
             {tabIndex === 4 && (
               <Button variant="contained" startIcon={<Add />} onClick={() => setIsAddSectionOpen(true)}>Add New</Button>
             )}
          </Box>
          <TabPanel value={tabIndex} index={0}>
            {isLoadingDept ? <CircularProgress /> : <DataTable rows={departments} columns={deptColumns} getRowId={(r) => r.id} />}
          </TabPanel>
          <TabPanel value={tabIndex} index={1}>
            {isLoadingCourse ? <CircularProgress /> : <DataTable rows={courses} columns={courseColumns} getRowId={(r) => r.id} />}
          </TabPanel>
          <TabPanel value={tabIndex} index={2}>
            {isLoadingYears ? <CircularProgress /> : <DataTable rows={years} columns={yearColumns} getRowId={(r) => r.id} />}
          </TabPanel>
          <TabPanel value={tabIndex} index={3}>
            {isLoadingSemesters ? <CircularProgress /> : <DataTable rows={semesters} columns={semColumns} getRowId={(r) => r.id} />}
          </TabPanel>
          <TabPanel value={tabIndex} index={4}>
            {isLoadingSections ? <CircularProgress /> : <DataTable rows={sections} columns={secColumns} getRowId={(r) => r.id} />}
          </TabPanel>
          <TabPanel value={tabIndex} index={5}>
            {isLoadingSubjects ? <CircularProgress /> : <DataTable rows={subjects} columns={subColumns} getRowId={(r) => r.id} />}
          </TabPanel>
          <TabPanel value={tabIndex} index={6}>
            {isLoadingAssessments ? <CircularProgress /> : <DataTable rows={assessmentTypes} columns={assessmentColumns} getRowId={(r) => r.id} />}
          </TabPanel>
        </CardContent>
      </Card>
      
      <AddSectionModal open={isAddSectionOpen} onClose={() => setIsAddSectionOpen(false)} />
    </Box>
  );
};

export default AcademicManagement;
