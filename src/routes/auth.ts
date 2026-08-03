import { Router, Request, Response } from 'express';

const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_CONFIRMATION =
  'If an account with that email exists, a reset link has been sent.';

interface SessionBody {
  mode?: unknown;
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
}

export interface RegisterRequest {
  mode: 'register';
  email: string;
  password: string;
  fullName: string;
}

export interface AuthSuccessResponse {
  token: string;
  userId: string;
}

authRouter.post('/session', (req: Request, res: Response) => {
  const body = req.body as SessionBody;

  if (body.mode === 'password_reset_request') {
    const email = body.email;

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    console.log(`auth.password_reset_requested email=${email}`);

    res.status(200).json({ message: GENERIC_CONFIRMATION });
    return;
  }

  if (body.mode === 'register') {
    res.status(501).json({ error: 'Not implemented.' });
    return;
  }

  res.status(400).json({ error: 'Unknown session mode.' });
});

export { authRouter };
