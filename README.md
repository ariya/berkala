# Berkala

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
npx berkala
```