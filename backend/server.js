require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
// Changes
const fs       = require('fs');
const path     = require('path');
// Changes
const authRoutes = require('./routes/auth');
const venueBookingRoutes = require('./routes/venueBookings');

const app  = express();
const PORT = process.env.PORT || 5000;

// Changes
const frontendDistPath = path.resolve(__dirname, '..', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);
// Changes

/* ─── Middleware ─────────────────────────────────────────── */
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Changes
if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}
// Changes

/* ─── Routes ─────────────────────────────────────────────── */
app.use('/api/auth', authRoutes);
app.use('/api/venue-bookings', venueBookingRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Changes
app.get(/^(?!\/api).*/, (req, res, next) => {
  if (!hasFrontendBuild) {
    return next();
  }

  return res.sendFile(frontendIndexPath);
});
// Changes

/* ─── DB + Server Start ───────────────────────────────────── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 ClubConnect API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
