#!/usr/bin/env node

const fs = require('fs');
const os = require('os');

const manifest = require('./package.json');
const readline = require('readline-sync');
const yaml = require('js-yaml');
const Bree = require('bree');

const pal = require('./src/pal');

const CONFIG_FILENAME = 'berkala.yml';

const SAMPLE_CONFIG = `
tasks:

  # Without an explicit interval, the task runs immediately
  boot:
    steps:
    - notify: Berkala starts now
    - say: Ready to rock and roll

  stay-hydrated:
    interval: every 1 hour
    steps:
    - notify: Drink some water! # TODO: how much?
    - print: Reminder was sent

  lunch:
    interval: at 11:58am
    steps:
    - notify: It's lunch time very soon
      title: Important
    - say: Get ready for lunch

  sign-of-life:
    interval: every 30 minutes
    steps:
    - print: Pings
    - run: |
        ping -c 3 google.com
        ping -c 5 bing.com
      timeout-minutes: 2

  weekend-exercise:
    cron: 0 9 * * 6  # every 9 morning on Saturday
    steps:
    - notify: Time for some exercises!
      title: Stay healthy
`;

/**
 * Returns true if interactivity is permitted (i.e. not in a CI)
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
            let conf = SAMPLE_CONFIG.trim();
            if (os.type() === 'Windows_NT') {
                // ping on Window does not support "-c"
                conf = conf.replace(/ping -c/gi, 'ping -n');
            }
            fs.writeFileSync(CONFIG_FILENAME, conf, 'utf-8');
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

function workerMessageHandler(workerData) {
    const workerMsg = workerData.message;
    const { duty } = workerMsg;
    if (duty === 'print') {
        const { message } = workerMsg;
        console.log(message);
    } else if (duty === 'notify') {
        const { title, message } = workerMsg;
        pal.notify(title, message);
    } else if (duty === 'say') {
        const { message } = workerMsg;
        pal.say(message);
    }
}

/**
 * Run a task, execute the steps sequentially.
 */

function runTask() {
    const child_process = require('child_process');
    const { workerData, parentPort } = require('worker_threads');

    const { job } = workerData;
    const { steps } = job;

    steps.forEach((step) => {
        if (step.print) {
            parentPort.postMessage({ duty: 'print', message: step.print });
        } else if (step.notify) {
            const title = step.title ? step.title : 'Berkala';
            const message = step.notify.trim();
            parentPort.postMessage({ duty: 'notify', title, message });
        } else if (step.say) {
            parentPort.postMessage({ duty: 'say', message: step.say });
        } else if (step.run) {
            const command = step.run;
            const cwd = step['working-directory'] || process.cwd();
            const timeoutMinutes = step['timeout-minutes'] || 3;
            const timeout = 60 * 1000 * timeoutMinutes;
            const options = { cwd, timeout };
            try {
                child_process.execSync(command, options);
            } catch (e) {
                const { errno, stderr } = e;
                const msg = stderr ? stderr.toString() : e.toString();
                console.error(`run error: ${errno} ${msg}`);
            }
        } else {
            console.error('Unknown step', step);
        }
    });
}

/**
 * Convert a task definition to a Bree job.
 */
function convert(name, task) {
    const { interval, cron } = task;
    let { steps } = task;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
        // Migrate legacy task format
        steps = [];
        const { type } = task;
        if (type === 'print') {
            const { message } = task;
            steps.push({ print: message });
        } else if (type === 'notify') {
            const { message, title } = task;
            steps.push({ notify: message, title });
        }
    }

    const path = runTask;
    return {
        name,
        path,
        interval,
        cron,
        steps
    };
}

/**
 * Create a Bree instance according to the configuration.
 */
function setupTasks(config) {
    const { tasks = [] } = config;
    const jobs = Object.keys(tasks).map((name) => {
        return convert(name, tasks[name]);
    });
    const root = false;
    return new Bree({ root, jobs, workerMessageHandler });
}

console.log('Berkala', manifest.version);
console.log();

const config = getConfig() || {};
const tasks = setupTasks(config);
tasks.start();
