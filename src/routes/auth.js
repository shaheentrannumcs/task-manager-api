const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { validateRegister } = require('../validation');
const { conflict, unauthorized, badRequest } = require('../errors');
const { requireAuth } = require('../middleware/auth');

const publicUser = ({ passwordHash, ...u }) => u;

module.exports = function authRoutes(store) {
  const router = express.Router();

  const sign = (user) => jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  router.post('/register', async (req, res) => {
    const { name, email, password } = validateRegister(req.body);
    if (store.users.findByEmail(email)) throw conflict('Email is already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = store.users.create({ name, email, passwordHash });
    res.status(201).json({ user: publicUser(user), token: sign(user) });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw badRequest('Email and password are required');
    const user = store.users.findByEmail(String(email).toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw unauthorized('Invalid email or password');
    res.json({ user: publicUser(user), token: sign(user) });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = store.users.findById(req.user.id);
    if (!user) throw unauthorized();
    res.json({ user: publicUser(user) });
  });

  return router;
};
