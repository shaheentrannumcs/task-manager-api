const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized } = require('../errors');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized('Missing bearer token'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

module.exports = { requireAuth };
