#!/usr/bin/env node

const fs = require('fs');
const yaml = require('js-yaml');
const Bree = require('bree');

/**
 * Retrieve the configuration from the external berkala.yml file.
 */
function getConfig() {
    const tasks = {};
    let config = { tasks };
    try {
        const contents = fs.readFileSync('berkala.yml', 'utf-8');
        config = yaml.load(contents);
    } catch (e) {
        console.error('Can not load configuration file');
        console.error(e.toString());
        process.exit(-1);
    }
    return config;
}

/**
 * A simple job to print a message via console.
 */
function printJob() {
    const { workerData } = require('worker_threads');
    const { job } = workerData;
    const { message } = job;
    console.log(message);
}

/**
 * A job that sends desktop notification.
 */
function notifyJob() {
    const notify = require('native-notifier');
    const { workerData } = require('worker_threads');
    const { job } = workerData;
    const { message } = job;
    let { title } = job;
    if (!title) {
        title = 'Berkala';
    }
    const app = 'Berkala';
    notify({ app, title, message });
}

/**
 * A job that dumps the worker data, useful for debugging.
 */
function debugJob() {
    const { workerData } = require('worker_threads');
    const { job } = workerData;

    console.log('debug job=', JSON.stringify(job));
}

/**
 * Convert a task definition to a Bree job.
 */
function convert(name, task) {
    const { type, interval } = task;

    let path;
    let options = {};
    const { message = null } = task;

    switch (type) {
        case 'debug':
            path = debugJob;
            options = task;
            break;

        case 'print':
            path = printJob;
            options = { message };
            break;

        case 'notify':
            path = notifyJob;
            const { title = null } = task;
            options = { title, message };
            break;

        default:
            break;
    }

    if (!path) {
        throw new Error('Unknown task type: ' + type);
    }

    return {
        name,
        path,
        interval,
        ...options
    };
}

/**
 * Create a Bree instance according to the configuration.
 */
function setupTasks(config) {
    const { tasks } = config;
    const jobs = Object.keys(tasks).map((name) => {
        return convert(name, tasks[name]);
    });
    return new Bree({ jobs });
}

// workaround an exception thrown by Bree
if (!fs.existsSync('jobs')) {
    fs.mkdirSync('jobs');
}

const config = getConfig();
const tasks = setupTasks(config);
tasks.start();
