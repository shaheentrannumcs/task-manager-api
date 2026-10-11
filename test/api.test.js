process.env.NODE_ENV = 'test';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

async function registerUser(app, email = 'shaheen@example.com') {
  const res = await request(app).post('/api/auth/register').send({ name: 'Shaheen', email, password: 'secret123' });
  return res.body.token;
}

describe('auth', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('registers and returns a token without the password hash', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Shaheen', email: 'S@Example.com', password: 'secret123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 's@example.com');
    assert.equal(res.body.user.passwordHash, undefined);
  });

  it('rejects invalid registration with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'S', email: 'nope', password: '123' });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ['email', 'name', 'password']);
  });

  it('rejects duplicate emails', async () => {
    await registerUser(app);
    const res = await request(app).post('/api/auth/register').send({ name: 'Again', email: 'shaheen@example.com', password: 'secret123' });
    assert.equal(res.status, 409);
  });

  it('logs in with correct credentials only', async () => {
    await registerUser(app);
    const ok = await request(app).post('/api/auth/login').send({ email: 'shaheen@example.com', password: 'secret123' });
    assert.equal(ok.status, 200);
    const bad = await request(app).post('/api/auth/login').send({ email: 'shaheen@example.com', password: 'wrongpass' });
    assert.equal(bad.status, 401);
  });

  it('returns the current user from /me', async () => {
    const token = await registerUser(app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Shaheen');
  });
});

describe('tasks', () => {
  let app;
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = createApp();
    token = await registerUser(app);
  });

  it('requires authentication', async () => {
    assert.equal((await request(app).get('/api/tasks')).status, 401);
    assert.equal((await request(app).get('/api/tasks').set('Authorization', 'Bearer bad')).status, 401);
  });

  it('creates a task with defaults', async () => {
    const res = await request(app).post('/api/tasks').set(auth()).send({ title: 'Write README' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'todo');
    assert.equal(res.body.priority, 'medium');
    assert.match(res.headers.location, /\/api\/tasks\//);
  });

  it('validates task fields', async () => {
    const res = await request(app).post('/api/tasks').set(auth()).send({ title: '', priority: 'urgent', dueDate: '12/10/2026' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.title && res.body.details.priority && res.body.details.dueDate);
  });

  it('updates, reads and deletes a task', async () => {
    const { body: task } = await request(app).post('/api/tasks').set(auth()).send({ title: 'Ship v1' });
    const upd = await request(app).patch(`/api/tasks/${task.id}`).set(auth()).send({ status: 'done' });
    assert.equal(upd.body.status, 'done');
    assert.equal((await request(app).get(`/api/tasks/${task.id}`).set(auth())).body.status, 'done');
    assert.equal((await request(app).delete(`/api/tasks/${task.id}`).set(auth())).status, 204);
    assert.equal((await request(app).get(`/api/tasks/${task.id}`).set(auth())).status, 404);
  });

  it('filters, searches and paginates', async () => {
    for (let i = 1; i <= 12; i += 1) {
      await request(app).post('/api/tasks').set(auth())
        .send({ title: `Task ${i}`, priority: i % 2 ? 'high' : 'low', status: i <= 3 ? 'done' : 'todo' });
    }
    const page2 = await request(app).get('/api/tasks?limit=5&page=2').set(auth());
    assert.equal(page2.body.items.length, 5);
    assert.equal(page2.body.total, 12);
    assert.equal(page2.body.pages, 3);

    const high = await request(app).get('/api/tasks?priority=high&limit=50').set(auth());
    assert.equal(high.body.total, 6);

    const search = await request(app).get('/api/tasks?search=task 1').set(auth());
    assert.equal(search.body.total, 4); // 1, 10, 11, 12
  });

  it('keeps tasks private to their owner', async () => {
    const { body: task } = await request(app).post('/api/tasks').set(auth()).send({ title: 'Private' });
    const other = await registerUser(app, 'other@example.com');
    const res = await request(app).get(`/api/tasks/${task.id}`).set('Authorization', `Bearer ${other}`);
    assert.equal(res.status, 404);
  });

  it('reports stats including overdue tasks', async () => {
    await request(app).post('/api/tasks').set(auth()).send({ title: 'Old', dueDate: '2020-01-01' });
    await request(app).post('/api/tasks').set(auth()).send({ title: 'Done', status: 'done', dueDate: '2020-01-01' });
    const res = await request(app).get('/api/tasks/stats').set(auth());
    assert.equal(res.body.total, 2);
    assert.equal(res.body.overdue, 1);
    assert.equal(res.body.byStatus.done, 1);
  });

  it('handles malformed JSON and unknown routes', async () => {
    const bad = await request(app).post('/api/tasks').set(auth()).set('Content-Type', 'application/json').send('{bad');
    assert.equal(bad.status, 400);
    assert.equal((await request(app).get('/nope')).status, 404);
  });
});
