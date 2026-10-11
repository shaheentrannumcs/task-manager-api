const { badRequest } = require('./errors');

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRegister({ name, email, password } = {}) {
  const errors = {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!email || !EMAIL_RE.test(email)) errors.email = 'A valid email is required';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
  return { name: name.trim(), email: email.toLowerCase(), password };
}

function validateTask(body = {}, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const { title, description, status, priority, dueDate } = body;

  if (title !== undefined || !partial) {
    if (!title || typeof title !== 'string' || !title.trim()) errors.title = 'Title is required';
    else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer';
    else out.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string') errors.description = 'Description must be a string';
    else out.description = description;
  }
  if (status !== undefined) {
    if (!STATUSES.includes(status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;
    else out.status = status;
  } else if (!partial) out.status = 'todo';
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}`;
    else out.priority = priority;
  } else if (!partial) out.priority = 'medium';
  if (dueDate !== undefined && dueDate !== null) {
    if (!DATE_RE.test(dueDate) || Number.isNaN(Date.parse(dueDate))) errors.dueDate = 'dueDate must be YYYY-MM-DD';
    else out.dueDate = dueDate;
  }

  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
  if (partial && !Object.keys(out).length) throw badRequest('No valid fields to update');
  return out;
}

function parseListQuery(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || 10));
  const allowedSort = ['createdAt', 'dueDate', 'priority', 'title'];
  const sortField = (q.sort || '-createdAt').replace(/^-/, '');
  if (!allowedSort.includes(sortField)) throw badRequest(`sort must be one of: ${allowedSort.join(', ')}`);
  if (q.status && !STATUSES.includes(q.status)) throw badRequest('Invalid status filter');
  if (q.priority && !PRIORITIES.includes(q.priority)) throw badRequest('Invalid priority filter');
  return { status: q.status, priority: q.priority, search: q.search, sort: q.sort || '-createdAt', page, limit };
}

module.exports = { validateRegister, validateTask, parseListQuery };
