const express = require('express'); // Reload 1
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(server, {
  cors: corsOptions
});

app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Routes
const authRoutes = require('./src/routes/authRoutes');
const setupRoutes = require('./src/routes/setupRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const facultyRoutes = require('./src/routes/facultyRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const errorHandler = require('./src/errors/errorHandler');
const logger = require('./src/utils/logger');
const { NotFoundError } = require('./src/errors/AppError');

app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Exam Portal API is running', status: 'OK' });
});

// Handle undefined routes
app.use((req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global Error Handler
app.use(errorHandler);

// Socket.IO Logic (Live Monitoring)
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joining specific rooms
  socket.on('join_room', (data) => {
    const { room, role, userId } = data; // e.g. room: `exam_${examId}` or `faculty_${userId}`
    socket.join(room);
    console.log(`User ${userId} (${role}) joined room ${room}`);
  });

  // Student joining an exam room
  socket.on('join_exam', (data) => {
    const { examId, studentId, name, register_no } = data;
    socket.join(`exam_${examId}`);
    
    // Notify faculty in the room
    io.to(`exam_${examId}`).emit('student_status_update', { studentId, name, register_no, status: 'ONLINE', timestamp: new Date() });
  });

  // Live status updates from student (fullscreen, warning count, current question, time remaining)
  socket.on('student_telemetry', (data) => {
    const { examId, studentId, ...telemetry } = data;
    io.to(`exam_${examId}`).emit('student_telemetry_update', { studentId, ...telemetry, timestamp: new Date() });
  });

  // Force Logout (sent to specific student's previous session if new login detected)
  socket.on('force_logout', (data) => {
    const { oldSessionToken } = data;
    // Assuming each browser session joins a room with its token
    io.to(`session_${oldSessionToken}`).emit('session_terminated');
  });

  // Anti-cheating warning triggered
  socket.on('trigger_warning', (data) => {
    const { examId, studentId, warningType, warningCount } = data;
    io.to(`exam_${examId}`).emit('student_warning_alert', { studentId, warningType, warningCount, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      const prisma = require('./src/utils/db');
      await prisma.$disconnect();
      console.log('Prisma connection pool disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('Error during Prisma disconnect:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// For nodemon restarts (SIGUSR2)
process.once('SIGUSR2', () => {
  console.log('\n[SIGUSR2] Nodemon restart triggered. Cleaning up...');
  server.close(async () => {
    try {
      const prisma = require('./src/utils/db');
      await prisma.$disconnect();
      console.log('Prisma disconnected for hot reload.');
    } catch (err) {
      console.error('Error during Prisma disconnect (SIGUSR2):', err);
    } finally {
      process.kill(process.pid, 'SIGUSR2');
    }
  });
});
