// index.js
require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');
const scheduler = require('./src/scheduler');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);

      // Initialize scheduler after server starts
      scheduler.init();
    });
  })
  .catch((err) => {
    console.error('Failed to connect DB', err);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection', err);
  process.exit(1);
});
