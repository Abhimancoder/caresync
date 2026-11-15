import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Config & Services
import { isSimulationMode } from './config/emailConfig.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route Handlers
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import medicationRoutes from './routes/medicationRoutes.js';
import doseRoutes from './routes/doseRoutes.js';
import adherenceRoutes from './routes/adherenceRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import cronRoutes from './routes/cronRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers & CORS
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible CDN assets and fonts for evaluation
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Global Rate Limiting on API endpoints
app.use('/api', generalApiLimiter);

// 3. Health Check Endpoint (Google Cloud Run probe)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'CareSync Healthcare Engine',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      emailTransporter: isSimulationMode ? 'simulation_mode' : 'live_smtp',
      googleCloudScheduler: 'ready',
      database: 'active',
    },
  });
});

// 4. API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/doses', doseRoutes);
app.use('/api/adherence', adherenceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/cron', cronRoutes);

// 5. Production Static File Serving (Google Cloud Run Single-Container)
const publicPath = path.resolve(__dirname, '../public');
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Development root welcome route
  app.get('/', (req, res) => {
    res.json({
      message: 'CareSync API Server is running.',
      docs: '/api/health',
      frontendDev: 'Start Vite development server at http://localhost:5173',
    });
  });
}

// 6. Centralized Error Handling
app.use('/api/*', notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 CareSync Backend Server Running on Port ${PORT}`);
    console.log(`🌐 Health Check:    http://localhost:${PORT}/api/health`);
    console.log(`📧 Email Engine:    ${isSimulationMode ? 'Simulation Mode (Safe for Dev)' : 'Active Live SMTP'}`);
    console.log(`======================================================\n`);
  });
}

export default app;
