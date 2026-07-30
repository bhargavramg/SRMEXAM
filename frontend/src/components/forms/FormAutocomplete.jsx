import React from 'react';
import { Autocomplete, TextField, Chip, Typography, Box } from '@mui/material';
import { useController } from 'react-hook-form';

const FormAutocomplete = ({
  name, control, label, options, rules,
  multiple = false, placeholder, disabled,
  required, freeSolo = false, getOptionLabel,
  onInputChange, loading,
  ...rest
}) => {
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error, invalid },
  } = useController({ name, control, rules });

  const defaultGetOptionLabel = (opt) => {
    if (typeof opt === 'string') return opt;
    return opt?.label || opt?.name || '';
  };

  const isOptionEqualToValue = (opt, val) => {
    if (typeof opt === 'string' || typeof val === 'string') return opt === val;
    return opt?.value === val?.value || opt?.id === val?.id || opt === val;
  };

  return (
    <Autocomplete
      multiple={multiple}
      options={options}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      value={value ?? (multiple ? [] : null)}
      onChange={(_, newValue) => onChange(newValue)}
      onBlur={onBlur}
      disabled={disabled}
      freeSolo={freeSolo}
      loading={loading}
      onInputChange={onInputChange}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const label = defaultGetOptionLabel(option);
          return <Chip key={index} label={label} size="small" {...getTagProps({ index })} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={ref}
          label={label}
          placeholder={placeholder}
          required={required}
          error={invalid}
          helperText={error ? error.message : undefined}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
          }}
        />
      )}
      {...rest}
    />
  );
};

export default FormAutocomplete;
