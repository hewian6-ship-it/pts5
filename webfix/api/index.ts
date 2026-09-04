import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    appPromise ??= createApp();
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('POS API initialization failed:', error);
    return res.status(500).json({
      error: 'POS API failed to initialize.',
      message: process.env.NODE_ENV === 'production' ? 'Check Vercel Function Logs.' : String(error),
    });
  }
}
