import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, 
  Checkbox, Typography, CircularProgress
} from '@mui/material';

const DataTable = ({
  rows = [],
  columns = [],
  loading = false,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  checkboxSelection = false,
  onRowSelectionChange,
  rowSelectionModel = [],
  getRowId = (row) => row.id,
  height,
  sx,
  onRowClick,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize || 10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id) => rowSelectionModel.indexOf(id) !== -1;

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n) => getRowId(n));
      onRowSelectionChange?.(newSelecteds);
      return;
    }
    onRowSelectionChange?.([]);
  };

  const handleClick = (event, id) => {
    if (!checkboxSelection) return;
    event.stopPropagation();
    const selectedIndex = rowSelectionModel.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(rowSelectionModel, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(rowSelectionModel.slice(1));
    } else if (selectedIndex === rowSelectionModel.length - 1) {
      newSelected = newSelected.concat(rowSelectionModel.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        rowSelectionModel.slice(0, selectedIndex),
        rowSelectionModel.slice(selectedIndex + 1),
      );
    }
    onRowSelectionChange?.(newSelected);
  };

  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card sx={{ ...sx }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ width: '100%', height: height || 'auto' }}>
          <TableContainer sx={{ maxHeight: height || Math.max(400, rows.length * 52 + 110) }}>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  {checkboxSelection && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={rowSelectionModel.length > 0 && rowSelectionModel.length < rows.length}
                        checked={rows.length > 0 && rowSelectionModel.length === rows.length}
                        onChange={handleSelectAllClick}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell 
                      key={col.field}
                      align={col.align || (col.type === 'number' ? 'right' : 'left')}
                      style={{ minWidth: col.minWidth || col.width, width: col.width }}
                      sx={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: 'grey.50' }}
                    >
                      {col.headerName || col.field}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (checkboxSelection ? 1 : 0)} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (checkboxSelection ? 1 : 0)} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">No rows</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row, index) => {
                    const id = getRowId(row);
                    const isItemSelected = isSelected(id);
                    return (
                      <TableRow
                        hover
                        onClick={(e) => onRowClick ? onRowClick({ row }) : handleClick(e, id)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        key={id}
                        selected={isItemSelected}
                        sx={{ cursor: (onRowClick || checkboxSelection) ? 'pointer' : 'default' }}
                      >
                        {checkboxSelection && (
                          <TableCell padding="checkbox">
                            <Checkbox checked={isItemSelected} onClick={(e) => handleClick(e, id)} />
                          </TableCell>
                        )}
                        {columns.map((col) => (
                          <TableCell 
                            key={col.field} 
                            align={col.align || (col.type === 'number' ? 'right' : 'left')}
                          >
                            {col.renderCell ? col.renderCell({ row, value: row[col.field] }) : row[col.field]}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={pageSizeOptions}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default DataTable;
