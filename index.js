#!/usr/bin/env node

const fs = require('fs');

const readline = require('readline-sync');
const yaml = require('js-yaml');
const Bree = require('bree');

const CONFIG_FILENAME = 'berkala.yml';

const SAMPLE_CONFIG = `
tasks:

  # Without an explicit interval, the task runs immediately
  boot:
    type: notify
    message: Berkala starts now

  # We need to stay hydrated
  hourly-ping:
    type: print
    interval: every 1 hour
    message: Drink some water!

  lunch-reminder:
    type: notify
    interval: at 11:58am
    title: Important reminder
    message: It's lunch time very soon
`;

/**
 * Returns true is interactivity is permitted (i.e. not in a CI)
 */
function isInteractive() {
    const stdout = process.stdout;
    return stdout.isTTY && !('CI' in process.env) && process.env.TERM !== 'dumb';
}

/**
 * Retrieve the configuration from the external berkala.yml file.
 */
function getConfig() {
    const tasks = {};
    let config = { tasks };
    if (!fs.existsSync(CONFIG_FILENAME) && isInteractive()) {
        console.log(CONFIG_FILENAME, 'does not exist.');
        const answer = readline.question('Do you want to create one (Y/n)? ').toUpperCase();
        if (answer === 'Y' || answer === 'YES') {
            fs.writeFileSync(CONFIG_FILENAME, SAMPLE_CONFIG.trim(), 'utf-8');
            return yaml.load(SAMPLE_CONFIG);
        } else {
            console.error('Can not continue, configuration does not exist!');
            process.exit(-1);
        }
    } else {
        try {
            const contents = fs.readFileSync(CONFIG_FILENAME, 'utf-8');
            config = yaml.load(contents);
        } catch (e) {
            console.error('Can not load configuration file');
            console.error(e.toString());
            process.exit(-1);
        }
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
