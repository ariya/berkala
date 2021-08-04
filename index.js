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
 * Convert a task definition to a Bree job.
 */
function convert(name, task) {
    const { type, interval } = task;

    let options = {};

    let path = './jobs/print.js'; // safe fallback
    switch (type) {
        case 'debug':
            path = './jobs/debug.js';
            options = task;
            break;

        case 'print':
        default:
            const { message } = task;
            options = { message };
            break;
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

const config = getConfig();
const tasks = setupTasks(config);
tasks.start();
