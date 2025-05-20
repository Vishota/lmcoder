import { orchestrate } from './orchestrator.js';
(async () => {
    const task = process.argv.slice(2).join(' ') || 'Create a simple social network';
    await orchestrate(task);
})();
