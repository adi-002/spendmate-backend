// src/app.js
const express = require('express');
require('express-async-errors'); // lets async errors bubble to handler
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const txRoutes = require('./routes/transactions');
const emailRoutes = require('./routes/emailRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', txRoutes);
app.use('/api/email', emailRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// global error handler
app.use(errorHandler);

module.exports = app;
