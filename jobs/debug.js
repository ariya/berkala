const { workerData } = require('worker_threads');
const { job } = workerData;

console.log('debug job=', JSON.stringify(job));
