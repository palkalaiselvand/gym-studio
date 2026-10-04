import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDb } from './db.js';
import membersRouter from './routes/members.js';
import studioRouter from './routes/studio.js';
import classesRouter from './routes/classes.js';
import seedRouter from './routes/seed.js';
import enrollmentsRouter from './routes/enrollments.js';
import authRouter from './routes/auth.js';
import accessRouter from './routes/access.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = new Set(
  (process.env.UI_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, origin || false);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Gym Studio Management API',
    database: 'Open-Source Document DB (NeDB/MongoDB)'
  });
});

// Mount Routes
app.use('/api/members', membersRouter);
app.use('/api/studio', studioRouter);
app.use('/api/classes', classesRouter);
app.use('/api/seed', seedRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/access', accessRouter);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Initialize Database & Start Server
async function startServer() {
  try {
    console.log('🚀 Initializing Document Database...');
    await initDb();

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🏋️  Gym Studio API Server Running on port ${PORT}`);
      console.log(`📍  URL: http://localhost:${PORT}`);
      console.log(`🩺  Health: http://localhost:${PORT}/api/health`);
      console.log(`📋  Members: http://localhost:${PORT}/api/members`);
      console.log(`🏢  Studio: http://localhost:${PORT}/api/studio`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
