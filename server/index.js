const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration for local development and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL // Will be set in production (e.g., Vercel URL)
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Community Kitchen API is running' });
});

const userRoutes = require('./routes/users');
const menuRoutes = require('./routes/menus');
const orderRoutes = require('./routes/orders');

app.use('/api/users', userRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);

// Initialize default users if they don't exist
function initializeDefaultUsers() {
  const users = db.all('users');

  // Create coordinator if doesn't exist
  if (!users.find(u => u.phone === '1122cc')) {
    db.insert('users', { phone: '1122cc', name: 'Coordinator', role: 'coordinator' });
    console.log('✅ Created default coordinator user (1122cc)');
  }

  // Create test user if doesn't exist
  if (!users.find(u => u.phone === '999')) {
    db.insert('users', { phone: '999', name: 'Test User', role: 'user' });
    console.log('✅ Created default test user (999)');
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initializeDefaultUsers();
});
