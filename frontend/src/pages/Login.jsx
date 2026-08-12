import React from 'react';
import { Box, Typography, TextField, Button, Checkbox, FormControlLabel, Paper, IconButton, InputAdornment, Tooltip } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { BookOpen, ArrowRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const user = await login({ identifier: email, password, rememberMe });
      if (user.role === 'STUDENT') {
         navigate('/student/dashboard');
      } else if (user.role === 'FACULTY') {
         navigate('/faculty/dashboard');
      } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
         navigate('/admin/dashboard');
      } else {
         navigate('/');
      }
    } catch (err) {
      if (err.message === 'Network Error' || err.error === 'Network error. Please check your connection.') {
        setError('Backend Server Unreachable. Please check your network connection or start the server.');
      } else {
        setError(err.error || err.message || 'An unexpected error occurred during login.');
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Left Side - Blue Gradient & Illustration */}
      <Box sx={{
        flex: 1,
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        p: 5,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background circle effect */}
        <Box sx={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
          top: '-200px',
          left: '-200px',
          borderRadius: '50%'
        }} />
        
        <GraduationCap size={200} strokeWidth={1} style={{ marginBottom: '40px', zIndex: 1 }} />
        <Typography variant="h2" sx={{ mb: 2, fontWeight: 700, textAlign: 'center', zIndex: 1 }}>
          Welcome to Portal
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, textAlign: 'center', maxWidth: '400px', zIndex: 1 }}>
          Access your examinations, results, and academic progress in one unified platform.
        </Typography>
      </Box>
      
      {/* Right Side - Login Form */}
      <Box sx={{
        width: { xs: '100%', md: '500px' },
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        p: { xs: 4, md: 8 },
        boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
        zIndex: 10
      }}>
        <Paper elevation={0} sx={{ 
          width: '100%', 
          maxWidth: '450px', 
          mx: 'auto',
          bgcolor: { xs: 'background.paper', md: 'transparent' },
          p: { xs: 4, md: 0 },
          borderRadius: { xs: 3, md: 0 },
          boxShadow: { xs: 3, md: 0 }
        }}>
          <Box sx={{ mb: 5, textAlign: 'center' }}>
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              bgcolor: '#F5FAFF',
              borderRadius: 3,
              color: 'primary.main',
              mb: 3
            }}>
              <BookOpen size={32} />
            </Box>
            <Typography variant="h4" color="text.secondary" fontWeight={700}>
              Portal Login
            </Typography>
          </Box>
          
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email or Register Number"
              variant="outlined"
              margin="normal"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
            />
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showPassword ? "Hide Password" : "Show Password"}>
                        <IconButton
                          aria-label={showPassword ? "Hide Password" : "Show Password"}
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                    color="primary" 
                  />
                } 
                label="Remember Me" 
              />
              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}>
                Forgot Password?
              </Typography>
            </Box>
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              size="large"
              endIcon={<ArrowRight size={20} />}
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              Login
            </Button>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};

export default Login;
