#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const child_process = require('child_process');

const manifest = require('./package.json');
const readline = require('readline-sync');
const yaml = require('js-yaml');
const Bree = require('bree');
const which = require('which');
const say = require('say');

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

  weekend-exercise:
    cron: 0 9 * * 6  # every 9 morning on Saturday
    steps:
    - notify: Time for some exercises!
      title: Stay healthy
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
 * Send a desktop notification
 * @param {string} title
 * @param {string} message
 */
function platformNotify(title, message) {
    if (os.type() === 'Linux') {
        const resolved = which.sync('notify-send', { nothrow: true });
        if (resolved) {
            child_process.spawnSync('notify-send', ['-a', 'Berkala', title, message]);
        } else {
            console.error('notify: unable to locate notify-send');
            console.log(title + ':', message);
        }
    } else if (os.type() === 'Darwin') {
        const command = `display notification "${message}" with title "Berkala" subtitle "${title}"`;
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
 * Convert text to audible speech
 * @param {string} message
 */
function platformSay(message) {
    if (os.type() === 'Linux') {
        const resolved = which.sync('festival', { nothrow: true });
        if (resolved) {
            say.speak(message);
        } else {
            console.error('say: unable to locate Festival');
            platformNotify(message);
        }
    } else if (os.type() === 'Windows_NT') {
        // TODO: check for Powershell first
        say.speak(message);
    } else if (os.type() === 'Darwin') {
        say.speak(message, 'Samantha'); // Siri's voice
    } else {
        // unsupported
        console.error('say: unsupport system', os.type());
        platformNotify(message);
    }
}

function workerMessageHandler(workerData) {
    const workerMsg = workerData.message;
    const { duty } = workerMsg;
    if (duty === 'print') {
        const { message } = workerMsg;
        console.log(message);
    } else if (duty === 'notify') {
        const { title, message } = workerMsg;
        platformNotify(title, message);
    } else if (duty === 'say') {
        const { message } = workerMsg;
        platformSay(message);
    }
}

/**
 * Run a task, execute the steps sequentially.
 */

function runTask() {
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
