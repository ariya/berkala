# Berkala

[![GitHub license](https://img.shields.io/github/license/ariya/berkala)](https://github.com/ariya/berkala/blob/main/LICENSE)
[![Tests](https://github.com/ariya/berkala/workflows/Tests/badge.svg)](https://github.com/ariya/berkala/actions)

Berkala runs scheduled tasks specified in a YAML-based configuration.

To get started, first download the binary for your operating system from the [Releases page](https://github.com/ariya/berkala/releases). Unpack the ZIP file and run the executable.

Since a config file does not exist yet, you will be offered to create one.
Simply accept it and `berkala.yml` will be created, which may look like the following:

```yml
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
```

The schedule for each task can be specified either with a human-friendly interval (e.g. `every 5 minutes`, `at 5pm`) or a cron expression (refer to [crontab guru](https://crontab.guru/) for more details). If neither is explicitly stated, then the task runs right away.

As of now, only the following types of tasks are available:

* `print`: displays a message to the standard output
* `notify`: sends a desktop notification (_only_ Linux and macOS for now)

Just like any regular YAML, everything from the `#` character until the end of the line will be ignored. Use this to insert comments.

<details>
<summary>Alternative way to run Berkala (with Node.js)</summary>

With [Node.js](https://nodejs.org/) v14 or later (that has [npx](https://www.npmjs.com/package/npx)):

```bash
npx @ariya/berkala
```

To run the development version, check out this repo and then:

```bash
npm install
npm start
```

[![npm version](https://img.shields.io/npm/v/@ariya/berkala)](https://www.npmjs.com/package/@ariya/berkala)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/@ariya/berkala.svg)](https://bundlephobia.com/result?p=@ariya/berkala)

</details>
