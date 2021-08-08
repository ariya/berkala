#!/usr/bin/env node

const fs = require('fs');

const manifest = require('./package.json');
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

  weekend-exercise:
    type: notify
    cron: 0 9 * * 6  # every 9 morning on Saturday
    title: Stay healthy
    message: Time for some exercises!
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
    const os = require('os');
    const child_process = require('child_process');
    const { workerData } = require('worker_threads');
    const { job } = workerData;
    const { message } = job;
    let { title } = job;
    if (!title) {
        title = 'Berkala';
    }
    if (os.type() === 'Linux') {
        child_process.spawnSync('notify-send', ['-a', 'Berkala', title, message]);
    } else if (os.type() === 'Darwin') {
        const command = `display notification "${message}" with title "${title}"`;
        child_process.spawnSync('osascript', ['-e', command]);
    } else if (os.type() === 'Windows_NT') {
        /**
         * Escape a string for PowerShell.
         * @param {string} str
         * @return {string}
         */
        function psEscape(str) {
            let result = '';
            for (let i = 0; i < str.length; i++) {
                const ch = str[i];
                if (ch.charCodeAt(0) === 39) {
                    // single quote, escape it with another single quote
                    result += ch;
                }
                result += ch;
            }
            return result;
        }

        const script = `
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;
            $templateType = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;
            $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($templateType);
            $template.SelectSingleNode(\"//text[@id=1]\").InnerText = '${psEscape(title)}';
            $template.SelectSingleNode(\"//text[@id=2]\").InnerText = '${psEscape(message)}';
            $toast = [Windows.UI.Notifications.ToastNotification]::new($template);
            $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Berkala');
            $notifier.Show($toast);`;

        child_process.execSync(script, { shell: 'powershell.exe' });
    } else {
        // FIXME what's this system?
        console.log(title, message);
    }
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
    const { type, interval, cron } = task;

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
        cron,
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
    const root = false;
    return new Bree({ root, jobs });
}

console.log('Berkala', manifest.version);
console.log();

const config = getConfig();
const tasks = setupTasks(config);
tasks.start();
