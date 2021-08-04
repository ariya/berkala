# Berkala

[![npm version](https://img.shields.io/npm/v/@ariya/berkala)](https://www.npmjs.com/package/@ariya/berkala)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/@ariya/berkala.svg)](https://bundlephobia.com/result?p=@ariya/berkala)
[![GitHub license](https://img.shields.io/github/license/ariya/berkala)](https://github.com/ariya/berkala/blob/main/LICENSE)
[![Tests](https://github.com/ariya/berkala/workflows/Tests/badge.svg)](https://github.com/ariya/berkala/actions)


Berkala runs scheduled tasks specified in a YAML configuration.

Requirement: [Node.js](https://nodejs.org/) v14 or later (with [npx](https://www.npmjs.com/package/npx)).

To give it a try, first create `berkala.yml` with the following contents:

```yml
tasks:

  boot:
    type: print
    message: Berkala starts now

  hourly-ping:
    type: print
    interval: every 1 hour
    message: It's been another hour

  lunch-reminder:
    type: print
    interval: at 11:59am
    message: Lunch time!
```

and then run:

```bash
npx @ariya/berkala
```
