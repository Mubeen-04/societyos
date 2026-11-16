import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import societyRoutes from './routes/societyRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import amenityRoutes from './routes/amenityRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import committeeRoutes from './routes/committeeRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import dailyHelpRoutes from './routes/dailyHelpRoutes.js';
import { stripeWebhook } from './controllers/stripePaymentController.js';

const app = express();
const clientDistPath = fileURLToPath(new URL('../client/dist/', import.meta.url));

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Stripe signs the exact request bytes, so mount its raw-body endpoint before JSON parsing.
app.post('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Request parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads
app.use('/uploads', express.static(path.resolve('uploads')));

// Rate limiting for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/maintenance', billingRoutes); // alias
app.use('/api/parking', parkingRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/committee', committeeRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/daily-help', dailyHelpRoutes);

// Keep unknown API requests as JSON and ahead of static and SPA handling.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Serve the Vite production bundle from server/client/dist.
app.use(express.static(clientDistPath));

// React Router owns non-API frontend routes. Keep uploads as ordinary 404s.
app.get('*', (req, res, next) => {
  if (req.path === '/uploads' || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), (error) => {
    if (error) next(error);
  });
});

// 404 handler for undefined non-API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
