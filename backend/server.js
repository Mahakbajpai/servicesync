import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/auth.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import providerRoutes from './routes/providers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json());

// Routes Hooking
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/providers', providerRoutes);

// Health Check / Default Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'ServiceSync API',
      version: '1.0.0',
      status: 'healthy',
    },
    message: 'Welcome to the ServiceSync API Gateway',
  });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `API endpoint ${req.originalUrl} not found`,
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[Express Error Handler]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
