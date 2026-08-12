const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');

const authenticateUser = async (identifier, password, ipAddress, userAgent) => {
  console.log(`[LOGIN DEBUG] Attempting login for identifier: ${identifier}`);
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
    console.log(`[LOGIN DEBUG] User not found for identifier: ${identifier}`);
    const err = new Error('Invalid credentials: User not found.');
    err.statusCode = 401;
    throw err;
  }
  
  console.log(`[LOGIN DEBUG] User found: ID=${user.id}, Role=${user.role}, Status=${user.status}`);

  if (user.status !== 'ACTIVE') {
    console.log(`[LOGIN DEBUG] User is not active. Status: ${user.status}`);
    const err = new Error(`Account is ${user.status}`);
    err.statusCode = 403;
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log(`[LOGIN DEBUG] bcrypt.compare result: ${isPasswordValid}`);
  
  if (!isPasswordValid) {
    const err = new Error('Invalid credentials: Password mismatch.');
    err.statusCode = 401;
    throw err;
  }

  console.log(`[LOGIN DEBUG] Generating JWTs for user ${user.id}`);
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, firstLogin: user.firstLogin },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
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
    { id: user.id, role: user.role, firstLogin: user.firstLogin },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
};

module.exports = {
  authenticateUser,
  refreshAccessToken
};
