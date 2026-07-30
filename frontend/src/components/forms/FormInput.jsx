import React from 'react';
import { TextField, Typography, Box } from '@mui/material';
import { useController } from 'react-hook-form';

const FormInput = ({
  name, control, label, rules, type = 'text',
  placeholder, disabled, multiline, rows,
  required, helperText, maxLength,
  ...rest
}) => {
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error, invalid },
  } = useController({ name, control, rules });

  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <Box>
      <TextField
        fullWidth
        id={name}
        name={name}
        label={label}
        type={type}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        inputRef={ref}
        error={invalid}
        helperText={error ? error.message : helperText}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        multiline={multiline}
        rows={rows}
        inputProps={{
          maxLength,
          ...(type === 'number' ? { min: 0 } : {}),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
          },
        }}
        {...rest}
      />
      {maxLength && (
        <Typography
          variant="caption"
          color={charCount > maxLength * 0.9 ? 'warning.main' : 'text.disabled'}
          sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
        >
          {charCount}/{maxLength}
        </Typography>
      )}
    </Box>
  );
};

export default FormInput;
