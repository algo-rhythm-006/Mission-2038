const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./api/routes/auth');
const uploadRoutes = require('./routes/upload');
const dashboardRoutes = require('./api/routes/dashboard');
const socialRoutes = require('./api/routes/social');
const tournamentRoutes = require('./api/routes/tournaments');
const videoRoutes = require('./api/routes/videos');
const trialRoutes = require('./api/routes/trials');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mission 2K38 API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'Mission 2K38 API server is active' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then((connected) => {
    if (!connected) {
      console.warn('[!] MongoDB connection failed. Server running in degraded mode.');
    }

    app.listen(PORT, () => {
      console.log(`[✓] Express backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[✗] Unexpected error while connecting to MongoDB:', error);
    app.listen(PORT, () => {
      console.log(`[✓] Express backend running on port ${PORT} (DB disconnected)`);
    });
  });
