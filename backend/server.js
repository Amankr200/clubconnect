require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const db      = require('./db');

const authRoutes = require('./routes/auth');
const venueBookingRoutes = require('./routes/venueBookings');
const societyRoutes = require('./routes/societies');
const storyRoutes = require('./routes/stories');
const bugRoutes = require('./routes/bugs');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

const frontendDistPath = path.resolve(__dirname, '..', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

/* ─── Middleware ─────────────────────────────────────────── */
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}

/* ─── Routes ─────────────────────────────────────────────── */
app.use('/api/auth', authRoutes);
app.use('/api/venue-bookings', venueBookingRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get(/^(?!\/api).*/, (req, res, next) => {
  if (!hasFrontendBuild) {
    return next();
  }

  return res.sendFile(frontendIndexPath);
});

/* ─── DB + Server Start ───────────────────────────────────── */
db.initDb()
  .then(() => {
    console.log('✅ PostgreSQL / Neon DB connected and schema verified');
    app.listen(PORT, () => {
      console.log(`🚀 ClubConnect API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection / schema error:', err.message);
    process.exit(1);
  });
