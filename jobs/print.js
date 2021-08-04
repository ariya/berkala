const { workerData } = require('worker_threads');
const { job } = workerData;
const { message } = job;
console.log(message);
