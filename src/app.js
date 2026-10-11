const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { createStore } = require('./store/memoryStore');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp({ store = createStore() } = {}) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  if (config.env !== 'test') app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use('/api/auth', authRoutes(store));
  app.use('/api/tasks', taskRoutes(store));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
