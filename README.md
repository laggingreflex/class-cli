
# class-cli

A class-based approach to creating a CLI app

## Install

```
npm i class-cli
```

## Usage

```
const CLI = require('class-cli')

class App extends CLI {

  /* Use `CLI.option` to Define the args/flags using yargs-like options object */
  arg = CLI.option({ type: 'string', default: 'value' })

  /* Use `CLI.command` to Define commands the same way */
  command = CLI.command({
    command: '$0 [arg]',
    description: 'do stuff',
    ...
  })
}

const app = new App()
/* Initialize */
CLI.init(app);
/* Run */
CLI.run(app);
```
