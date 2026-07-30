const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');

const authenticateUser = async (identifier, password, ipAddress, userAgent) => {
  // Check if identifier is email or register_no
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { register_no: identifier }
      ]
    }
  });

  if (!user) {
    throw new Error('Invalid credentials.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials.');
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const oldSessions = await prisma.browserSession.findMany({
    where: { userId: user.id }
  });
  const oldSessionTokens = oldSessions.map(s => s.token);

  await prisma.browserSession.deleteMany({
    where: { userId: user.id }
  });

  await prisma.browserSession.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    }
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      ipAddress: ipAddress || null,
      browser: userAgent || null
    }
  });

  return { user, accessToken, refreshToken, oldSessionTokens };
};

const refreshAccessToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new Error('User not found.');

  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

module.exports = {
  authenticateUser,
  refreshAccessToken
};
