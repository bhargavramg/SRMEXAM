import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565C0',
      light: '#42A5F5',
      dark: '#0b4295ff',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFCFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#0D47A1',
    },
    success: {
      main: '#1976D2',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600, fontSize: '36px' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    body1: { fontSize: '16px' },
    body2: { fontSize: '14px' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '14px',
          minHeight: 40,
        },
        sizeMedium: {
          minHeight: 40,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(21, 101, 192, 0.08)',
          border: '1px solid #E3F2FD',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 40,
        },
        input: {
          padding: '10px 14px',
          fontSize: '16px',
        },
        multiline: {
          padding: 0,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '14px',
          '&.MuiInputLabel-shrink': {
            fontSize: '14px',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          paddingTop: 10,
          paddingBottom: 10,
          fontSize: '16px',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: '14px',
          fontWeight: 500,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '14px',
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
