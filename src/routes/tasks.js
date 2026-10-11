const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateTask, parseListQuery } = require('../validation');
const { notFound } = require('../errors');

module.exports = function taskRoutes(store) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', (req, res) => {
    res.json(store.tasks.list(req.user.id, parseListQuery(req.query)));
  });

  router.get('/stats', (req, res) => {
    res.json(store.tasks.stats(req.user.id));
  });

  router.post('/', (req, res) => {
    const task = store.tasks.create(req.user.id, validateTask(req.body));
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  router.get('/:id', (req, res) => {
    const task = store.tasks.findOne(req.user.id, req.params.id);
    if (!task) throw notFound('Task not found');
    res.json(task);
  });

  router.patch('/:id', (req, res) => {
    const task = store.tasks.update(req.user.id, req.params.id, validateTask(req.body, { partial: true }));
    if (!task) throw notFound('Task not found');
    res.json(task);
  });

  router.delete('/:id', (req, res) => {
    if (!store.tasks.remove(req.user.id, req.params.id)) throw notFound('Task not found');
    res.status(204).end();
  });

  return router;
};
