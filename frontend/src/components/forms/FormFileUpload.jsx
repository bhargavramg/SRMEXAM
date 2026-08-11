import React, { useRef } from 'react';
import { Box, Button, Typography, Chip, Paper } from '@mui/material';
import { CloudUpload, InsertDriveFile, Close } from '@mui/icons-material';
import { useController } from 'react-hook-form';
import { useSnackbar } from 'notistack';

const FormFileUpload = ({
  name, control, label, rules,
  accept = '*', multiple = false, maxSize,
  disabled, required,
}) => {
  const inputRef = useRef(null);
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name, control, rules });
  
  const { enqueueSnackbar } = useSnackbar();

  const files = value ? (Array.isArray(value) ? value : [value]) : [];

  const handleSelect = (event) => {
    const selected = Array.from(event.target.files);
    if (maxSize) {
      const oversized = selected.filter(f => f.size > maxSize);
      if (oversized.length) {
        enqueueSnackbar(`File(s) exceed maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`, { variant: 'error' });
        return;
      }
    }
    onChange(multiple ? selected : selected[0]);
    event.target.value = '';
  };

  const handleRemove = (index) => {
    if (multiple) {
      const updated = files.filter((_, i) => i !== index);
      onChange(updated.length ? updated : null);
    } else {
      onChange(null);
    }
  };

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} gutterBottom>
        {label}{required && <Typography component="span" color="error.main"> *</Typography>}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'grey.50',
          borderStyle: 'dashed',
          borderColor: error ? 'error.main' : 'divider',
          cursor: disabled ? 'not-allowed' : 'pointer',
          '&:hover': !disabled ? { borderColor: 'primary.main', bgcolor: 'primary.light' } : {},
        }}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleSelect}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        <CloudUpload sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Click to upload or drag and drop
        </Typography>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
          {accept === '*' ? 'All files supported' : accept}
          {maxSize && ` | Max ${Math.round(maxSize / 1024 / 1024)}MB`}
        </Typography>
      </Paper>
      {error && (
        <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
          {error.message}
        </Typography>
      )}
      {files.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {files.map((file, index) => (
            <Chip
              key={index}
              icon={<InsertDriveFile />}
              label={file.name || `File ${index + 1}`}
              onDelete={disabled ? undefined : () => handleRemove(index)}
              deleteIcon={<Close fontSize="small" />}
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FormFileUpload;
