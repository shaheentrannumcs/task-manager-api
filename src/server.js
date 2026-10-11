const { createApp } = require('./app');
const config = require('./config');

createApp().listen(config.port, () => {
  console.log(`Task Manager API listening on http://localhost:${config.port}`);
});
