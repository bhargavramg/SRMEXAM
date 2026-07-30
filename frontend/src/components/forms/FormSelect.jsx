import React from 'react';
import {
  FormControl, FormHelperText, InputLabel, Select,
  MenuItem, Box, Chip, Typography,
} from '@mui/material';
import { useController } from 'react-hook-form';

const FormSelect = ({
  name, control, label, options, rules,
  multiple = false, placeholder, disabled,
  required, renderValue, renderOption, helperText,
  ...rest
}) => {
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error, invalid },
  } = useController({ name, control, rules });

  const handleChange = (event) => {
    const val = event.target.value;
    onChange(multiple ? val : val === '' ? '' : val);
  };

  return (
    <FormControl fullWidth error={invalid} disabled={disabled} required={required}>
      <InputLabel id={`${name}-label`}>{label}</InputLabel>
      <Select
        labelId={`${name}-label`}
        id={name}
        value={value ?? (multiple ? [] : '')}
        onChange={handleChange}
        onBlur={onBlur}
        inputRef={ref}
        label={label}
        multiple={multiple}
        displayEmpty={!!placeholder}
        renderValue={renderValue || (multiple
          ? (selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((val) => {
                  const opt = options.find(o => o.value === val);
                  return <Chip key={val} label={opt?.label || val} size="small" />;
                })}
              </Box>
            )
          : undefined
        )}
        sx={{ borderRadius: 1.5 }}
        {...rest}
      >
        {placeholder && !multiple && (
          <MenuItem value="" disabled>
            <Typography variant="body2" color="text.secondary">{placeholder}</Typography>
          </MenuItem>
        )}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {renderOption ? renderOption(opt) : opt.label}
          </MenuItem>
        ))}
      </Select>
      {(error || helperText) && (
        <FormHelperText>{error ? error.message : helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default FormSelect;
