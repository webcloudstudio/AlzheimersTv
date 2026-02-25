/**
 * Scheduler / Orchestrator
 * CLI entry point for all pipeline commands.
 *
 * Recommended workflow:
 *   1. npm run init          — first time only: create DB, seed 16 services
 *   2. npm run bulk          — every few weeks: download full TMDB catalog (~900K titles)
 *   3. npm run seed          — when CSVs change: import curated titles, resolve TMDB IDs
 *   4. npm run pipeline      — daily: enrich metadata → fetch stream URLs → verify → generate HTML
 *
 * Other commands:
 *   npm run pipeline:full    — seed + full pipeline (useful for a fresh start after bulk)
 *   npm run pipeline:verify  — only verify stored URLs (Phase C)
 *   npm run generate         — only regenerate index.html from current DB state
 */
import { initSchema } from './db/schema.js';
import { closeDb } from './db/connection.js';
import { runBulkImport } from './pipeline/tmdbBulkImport.js';
import { runTmdbEnrich } from './pipeline/tmdbEnrich.js';
import { runTmdbProviders } from './pipeline/tmdbProviders.js';
import { runWatchmodeEnrich } from './pipeline/watchmodeEnrich.js';
import { runMotnEnrich } from './pipeline/motnEnrich.js';
import { runUrlVerifier } from './pipeline/urlVerifier.js';
import { runSeedFeatured } from './pipeline/seedFeatured.js';
import { generateHtml } from './htmlGenerator.js';

const command = process.argv[2] ?? 'pipeline';

async function main() {
  console.log(`\nAlzheimersTv downloader — command: ${command}\n`);

  switch (command) {

    // ── One-time setup ────────────────────────────────────────────────────────
    case 'init': {
      initSchema();
      break;
    }

    // ── A1: TMDB catalog bulk download (run every few weeks) ─────────────────
    case 'bulk': {
      initSchema();
      await runBulkImport();
      break;
    }

    // ── Import curated CSV titles as featured shows ────────────────────────────
    case 'seed': {
      initSchema();
      await runSeedFeatured();
      break;
    }

    // ── Daily pipeline: enrich → stream URLs → verify → generate ─────────────
    case 'pipeline': {
      initSchema();
      await runTmdbEnrich();      // A2: fill unfetched first, then refresh stale
      await runTmdbProviders();   // A3: which services carry each show
      await runWatchmodeEnrich(); // B1: direct stream URLs (budget-enforced)
      await runMotnEnrich();      // B2: more stream URLs (budget-enforced)
      await runUrlVerifier();     // C:  HEAD ping all stored URLs
      await generateHtml();
      break;
    }

    // ── Full pipeline after bulk import (seed + daily pipeline) ───────────────
    case 'pipeline:full': {
      initSchema();
      await runSeedFeatured();
      await runTmdbEnrich();
      await runTmdbProviders();
      await runWatchmodeEnrich();
      await runMotnEnrich();
      await runUrlVerifier();
      await generateHtml();
      break;
    }

    // ── Only URL verification ─────────────────────────────────────────────────
    case 'pipeline:verify': {
      initSchema();
      await runUrlVerifier();
      break;
    }

    // ── Only regenerate HTML ──────────────────────────────────────────────────
    case 'generate': {
      initSchema();
      await generateHtml();
      break;
    }

    default: {
      console.error(`Unknown command: "${command}"`);
      console.error('Valid commands: init, bulk, seed, pipeline, pipeline:full, pipeline:verify, generate');
      process.exit(1);
    }
  }
}

main()
  .then(() => {
    closeDb();
    console.log('\nDone.');
  })
  .catch(err => {
    console.error('\nFatal error:', err);
    closeDb();
    process.exit(1);
  });
