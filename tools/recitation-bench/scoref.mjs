const [f,...names]=process.argv.slice(2);
globalThis.FILTER=eval(f); process.argv=[process.argv[0],'score.mjs',...names];
await import('./score.mjs');
