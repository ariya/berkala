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
    steps:
    - notify: Berkala starts now

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
```
Just like any regular YAML, everything from the `#` character until the end of the line will be ignored. Use this to insert comments.

The schedule for each task can be specified as:
* [a human-friendly interval](https://breejs.github.io/later/parsers.html#text),  e.g. `every 5 minutes`, `at 5pm`, or
* [a cron expression](https://crontab.guru/), e.g. `0 9 * * 6`

If neither is explicitly stated, then the task runs right away.

Each task consists of one or more steps.

Every step must be one of the following:

<details><summary><code>print</code>: displays a message to the standard output</summary></details>

<details><summary><code>notify</code>: sends a desktop notification</summary>

The notification is supported on the following system:

* Windows: [Windows.UI.Notifications](https://docs.microsoft.com/en-us/uwp/api/windows.ui.notifications.toastnotification) via [Powershell scripting](https://docs.microsoft.com/en-us/powershell/scripting)
* macOS: `display notification` with [AppleScript](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_cmds.html)
* Linux: [notify-send](https://www.commandlinux.com/man-page/man1/notify-send.1.html), e.g. part of `libnotify-bin` package on Debian/Ubuntu

</details>

<details><summary><code>say</code>: converts text to audible speech</summary>

The text-to-speech conversion is supported on the following system:

* Windows: [System.Speech.Synthesis](https://docs.microsoft.com/en-us/dotnet/api/system.speech.synthesis) via [Powershell scripting](https://docs.microsoft.com/en-us/powershell/scripting)
* macOS: `say` with [AppleScript](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_cmds.html)
* Linux: [Festival speech synthesis](https://www.cstr.ed.ac.uk/projects/festival/), e.g. `festival` and `festvox-kallpc16k` on Debian/Ubuntu

</details>

Found a problem or have a new idea? File [an issue](https://github.com/ariya/berkala/issues)!

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
