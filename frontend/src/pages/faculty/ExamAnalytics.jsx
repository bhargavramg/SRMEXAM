import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Divider, Button
} from '@mui/material';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import facultyApi from '../../api/facultyApi';

export default function ExamAnalytics() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ['examAnalytics', examId],
    queryFn: () => facultyApi.getExamAnalytics(examId),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (isError || !analytics) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">Failed to load analytics</Typography></Box>;

  const { exam, summary, distribution, gradeDistribution, top10, questionAnalysis } = analytics;

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/faculty/results')} sx={{ mb: 2 }}>
          Back to Results
        </Button>
        <PageHeader 
          title={`${exam?.title || 'Unknown'} - Analytics`}
          subtitle={`Subject: ${exam?.subject || 'N/A'} | Total Marks: ${exam?.totalMarks || 0}`}
          breadcrumbs={[
            { label: 'Faculty' },
            { label: 'Results', path: '/faculty/results' },
            { label: 'Analytics' }
          ]}
        />
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Submissions</Typography>
              <Typography variant="h4">{summary.totalSubmissions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Pass Percentage</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" color={summary.passPercentage >= 50 ? 'success.main' : 'error.main'}>
                  {summary.passPercentage}%
                </Typography>
                {summary.passPercentage >= 50 ? <TrendingUp size={24} color="#10B981" /> : <TrendingDown size={24} color="#EF4444" />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Average Score</Typography>
              <Typography variant="h4" color="primary.main">{summary.avgScore}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>High / Low / SD</Typography>
              <Typography variant="h6">{summary.highestScore}% / {summary.lowestScore}% / {summary.stdDeviation}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Grade Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['S', 'A', 'B', 'C', 'D', 'F'].map(grade => {
                const count = gradeDistribution ? (gradeDistribution[grade] || 0) : 0;
                const total = summary.totalSubmissions || 1;
                const percent = (count / total) * 100;
                return (
                  <Box key={grade} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" sx={{ width: 20, fontWeight: 'bold' }}>{grade}</Typography>
                    <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                      <Box sx={{ width: `${percent}%`, bgcolor: grade === 'F' ? 'error.main' : 'primary.main', height: '100%' }} />
                    </Box>
                    <Typography variant="body2" sx={{ width: 30, textAlign: 'right' }}>{count}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Score Distribution Buckets */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Score Distribution</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(distribution || {}).map(([range, count]) => {
                const total = summary.totalSubmissions || 1;
                const percent = (count / total) * 100;
                return (
                  <Box key={range} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ width: 60 }}>{range}</Typography>
                    <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                      <Box sx={{ width: `${percent}%`, bgcolor: 'secondary.main', height: '100%' }} />
                    </Box>
                    <Typography variant="body2" sx={{ width: 30, textAlign: 'right' }}>{count}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid #e5e7eb' }}>
              <Typography variant="h6">Top Performers</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Register No.</TableCell>
                    <TableCell align="center">Grade</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(top10 || []).map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>#{r.rank || (idx + 1)}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                      <TableCell>{r.registerNo}</TableCell>
                      <TableCell align="center">
                        <Chip label={r.grade} size="small" color={r.grade === 'F' ? 'error' : 'success'} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{r.percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {(!top10 || top10.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No results found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Question Level Analysis */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Question-wise Analysis</Typography>
              <Target size={24} color="#6B7280" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Difficulty</TableCell>
                    <TableCell align="right">Max Marks</TableCell>
                    <TableCell align="right">Avg Marks</TableCell>
                    <TableCell align="right">Correct %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(questionAnalysis || []).map((q) => (
                    <TableRow key={q.questionId} hover>
                      <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.questionText}
                      </TableCell>
                      <TableCell>
                        <Chip label={q.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={q.difficulty} 
                          size="small" 
                          color={q.difficulty === 'Hard' ? 'error' : q.difficulty === 'Medium' ? 'warning' : 'success'} 
                        />
                      </TableCell>
                      <TableCell align="right">{q.maxMarks}</TableCell>
                      <TableCell align="right">{q.avgMarks}</TableCell>
                      <TableCell align="right">
                        <Typography color={q.correctPercentage >= 70 ? 'success.main' : q.correctPercentage <= 40 ? 'error.main' : 'warning.main'}>
                          {q.correctPercentage}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!questionAnalysis || questionAnalysis.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>No question data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}