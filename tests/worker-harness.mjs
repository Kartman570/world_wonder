import { parentPort } from 'node:worker_threads';
globalThis.postMessage = (data) => parentPort.postMessage(data);
const { handleMessage } = await import('../src/core/path-worker.js');
parentPort.on('message', (data) => handleMessage({ data }));
