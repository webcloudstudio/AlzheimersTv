import { Router, Request, Response } from 'express';
import { resolve } from 'path';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.sendFile(resolve(__dirname, '../../public/index.html'));
});

export default router;
