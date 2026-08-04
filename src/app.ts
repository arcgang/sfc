import express from 'express';
import { authRouter } from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import { getDb } from './db.js';

const app = express();

app.use(express.json());

// Ensure schema is in sync before accepting traffic.
getDb();

app.use('/api/v1/auth', authRouter);

// Protected stub — real implementation added in subsequent tasks.
app.use('/api/v1/profile', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

export { app };
