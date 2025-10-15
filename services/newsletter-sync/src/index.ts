import { runSync } from './sync.js';

export * from './sync.js';
export * from './config.js';
export * from './cache.js';
export * from './assets.js';

const isMainModule = (): boolean => {
  if (typeof process === 'undefined') {
    return false;
  }
  const current = new URL(import.meta.url);
  const entry = process.argv[1] ? new URL(`file://${process.argv[1]}`) : null;
  return Boolean(entry && current.pathname === entry.pathname);
};

if (isMainModule()) {
  runSync().catch((error) => {
    console.error('[newsletter-sync]', { error: error instanceof Error ? error.stack ?? error.message : String(error) });
    process.exitCode = 1;
  });
}
