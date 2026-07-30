import React from 'react';
import { Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useController } from 'react-hook-form';

const FormDatePicker = ({
  name, control, label, rules,
  disabled, required, minDate, maxDate,
  ...rest
}) => {
  const {
    field: { onChange, value, ref },
    fieldState: { error, invalid },
  } = useController({ name, control, rules });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label={label}
        value={value || null}
        onChange={(newValue) => onChange(newValue)}
        inputRef={ref}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        slotProps={{
          textField: {
            fullWidth: true,
            error: invalid,
            helperText: error ? error.message : undefined,
            required,
            sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } },
          },
        }}
        {...rest}
      />
    </LocalizationProvider>
  );
};

export default FormDatePicker;
