const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');

dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const { setSocketIO } = require('./services/notificationService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

setSocketIO(io);

// Connect DB
connectDB();

// Body Parsers & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes Initialization
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/targets', require('./routes/targetRoutes'));
app.use('/api/incentives', require('./routes/incentiveRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Kevalon Technology Tapzy CRM Backend API running smoothly.' });
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const fs = require('fs');

// Serve Frontend Production Build if built
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      path.extname(req.path)
    ) {
      return next();
    }

    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handling Middleware
app.use(errorHandler);

let PORT = process.env.PORT || 5000;

const startServer = (p) => {
  server.listen(p, () => {
    console.log(`=======================================================`);
    console.log(`  KEVALON TECHNOLOGY TAPZY CRM BACKEND SERVER RUNNING   `);
    console.log(`  PORT: ${p} | ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Port Warning] Port ${PORT} is in use. Trying port ${Number(PORT) + 1}...`);
    PORT = Number(PORT) + 1;
    startServer(PORT);
  } else {
    console.error(err);
  }
});

startServer(PORT);
