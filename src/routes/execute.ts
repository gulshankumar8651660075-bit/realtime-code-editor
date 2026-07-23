import { Router, Request, Response } from 'express';
import { executeCode } from '../services/sandbox';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { code, language, timeoutMs } = req.body;

  if (code === undefined || !language) {
    return res.status(400).json({ error: 'Parameters "code" and "language" are required' });
  }

  try {
    const result = await executeCode(code, language, timeoutMs);
    return res.json(result);
  } catch (err: any) {
    console.error('Code execution endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error executing code' });
  }
});

export default router;
