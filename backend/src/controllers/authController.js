const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const { user, accessToken, refreshToken, oldSessionTokens } = await authService.authenticateUser(identifier, password, ipAddress, userAgent);
    
    // Multiple Login Detection - force old sessions to logout
    if (oldSessionTokens && oldSessionTokens.length > 0) {
      const io = req.app.get('io');
      if (io) {
        oldSessionTokens.forEach(token => {
          io.to(`session_${token}`).emit('session_terminated');
        });
      }
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        register_no: user.register_no
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token is required.' });

    const newAccessToken = await authService.refreshAccessToken(token);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token.' });
  }
};

module.exports = {
  login,
  refreshToken
};
