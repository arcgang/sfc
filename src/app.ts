import express from 'express';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { getDb } from './db.js';

const app = express();

app.use(express.json());

// Ensure schema is in sync before accepting traffic.
getDb();

app.use('/api/v1/auth', authRouter);
app.use('/api/profile', profileRouter);

export { app };
