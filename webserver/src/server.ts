import express from 'express';
import { resolve } from 'path';
import { getDb } from './db/connection';
import apiRouter from './routes/api';
import pagesRouter from './routes/pages';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(resolve(__dirname, '../public')));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api', apiRouter);
app.use('/', pagesRouter);

// ─── Start ────────────────────────────────────────────────────────────────────

function start() {
  // Verify DB is reachable before accepting requests
  try {
    getDb();
  } catch (err) {
    console.error('\nFatal: Could not open database.');
    console.error(err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\nAlzheimersTv web server listening on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop.\n');
  });
}

start();
