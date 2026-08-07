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
        register_no: user.register_no,
        firstLogin: user.firstLogin
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const prisma = require('../utils/db');
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        register_no: user.register_no,
        firstLogin: user.firstLogin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data.' });
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

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8 || newPassword.length > 64) {
      return res.status(400).json({ error: 'New password must be between 8 and 64 characters' });
    }

    const prisma = require('../utils/db');
    const bcrypt = require('bcrypt');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: 'Invalid current password' });

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    if (user.register_no && newPassword === user.register_no) {
      return res.status(400).json({ error: 'New password cannot be the same as your Register Number' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, firstLogin: false }
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: 'PASSWORD_CHANGED',
        details: 'User successfully changed their password'
      }
    });

    // Also update First Login Completed if they were first login
    if (user.firstLogin) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          role: user.role,
          action: 'FIRST_LOGIN_COMPLETED',
          details: 'User completed their mandatory first login password change'
        }
      });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { login, refreshToken, changePassword, me };
