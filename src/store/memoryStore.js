const crypto = require('node:crypto');

/**
 * Simple in-memory data store. Keeps the same interface a database-backed
 * repository would, so it can be swapped for PostgreSQL/MongoDB later.
 */
function createStore() {
  const users = new Map();
  const tasks = new Map();

  return {
    users: {
      create({ name, email, passwordHash }) {
        const user = { id: crypto.randomUUID(), name, email, passwordHash, createdAt: new Date().toISOString() };
        users.set(user.id, user);
        return user;
      },
      findByEmail(email) {
        return [...users.values()].find((u) => u.email === email) || null;
      },
      findById(id) {
        return users.get(id) || null;
      },
    },
    tasks: {
      create(ownerId, data) {
        const now = new Date().toISOString();
        const task = { id: crypto.randomUUID(), ownerId, ...data, createdAt: now, updatedAt: now };
        tasks.set(task.id, task);
        return task;
      },
      findOne(ownerId, id) {
        const t = tasks.get(id);
        return t && t.ownerId === ownerId ? t : null;
      },
      list(ownerId, { status, priority, search, sort = '-createdAt', page = 1, limit = 10 } = {}) {
        let items = [...tasks.values()].filter((t) => t.ownerId === ownerId);
        if (status) items = items.filter((t) => t.status === status);
        if (priority) items = items.filter((t) => t.priority === priority);
        if (search) {
          const q = search.toLowerCase();
          items = items.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
        }
        const desc = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        items.sort((a, b) => {
          const av = a[field] ?? '';
          const bv = b[field] ?? '';
          return (av > bv ? 1 : av < bv ? -1 : 0) * (desc ? -1 : 1);
        });
        const total = items.length;
        const start = (page - 1) * limit;
        return { items: items.slice(start, start + limit), total, page, limit, pages: Math.ceil(total / limit) || 1 };
      },
      update(ownerId, id, changes) {
        const t = this.findOne(ownerId, id);
        if (!t) return null;
        Object.assign(t, changes, { updatedAt: new Date().toISOString() });
        return t;
      },
      remove(ownerId, id) {
        const t = this.findOne(ownerId, id);
        if (!t) return false;
        return tasks.delete(id);
      },
      stats(ownerId) {
        const mine = [...tasks.values()].filter((t) => t.ownerId === ownerId);
        const today = new Date().toISOString().slice(0, 10);
        return {
          total: mine.length,
          byStatus: countBy(mine, 'status'),
          byPriority: countBy(mine, 'priority'),
          overdue: mine.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done').length,
        };
      },
    },
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});
}

module.exports = { createStore };
