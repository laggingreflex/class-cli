const yargs = require('yargs');
const Config = require('configucius');
const _ = require('./utils');

class Option extends _.iClass {};
class Command extends _.iClass {};
const $ = {
  opts: Symbol('opts'),
  initialized: Symbol('initialized'),
  command: Symbol('command'),
  reset: Symbol('reset'),
  options: Symbol('options'),
  commands: Symbol('commands'),
};

module.exports = class CLI extends Config {
  static CLI = CLI;

  /**
   * @returns {any}
   */
  static option(option) { return new Option(option) }

  /**
   * @returns {function}
   */
  static command(command) {
    if (typeof command === 'function') {
      command = { command: command.name, handler: command };
    }
    return new Command(command);
  }

  /**
   * Initialize
   * @param {CLI} cli
   * @param {object} [opts]
   * @param {boolean} [opts.promptCommand] Prompt if no command given
   * @param {function} [opts.yargs]
   */
  static init(cli, opts) {
    if (cli[$.initialized]) return;
    const options = [];
    const commands = [];
    for (const key of Object.getOwnPropertyNames(cli)) {
      const value = cli[key];
      if (value instanceof Option) {
        options.push(key);
        yargs.option(key, value);
        delete cli[key];
      } else if (value instanceof Command) {
        commands.push({ key, value });
        yargs.command({
          ...value,
          handler: () => _.define(cli, $.command, { value }),
        });
        cli[key] = value.handler;
      }
    }
    if (opts.yargs) opts.yargs(yargs);
    const argv = yargs.argv;
    cli.$load(null, { keys: options });
    for (const key of options) {
      if (key in argv) {
        const defaulted = key in yargs.parsed.defaulted;
        if (!defaulted || !(key in cli)) {
          cli[key] = argv[key];
        }
      }
    }
    _.define(cli, $.opts, { value: opts });
    _.define(cli, $.initialized, { value: true });
    _.define(cli, $.options, { value: options });
    _.define(cli, $.commands, { value: commands });
  }
  static run(cli, ...args) {
    cli.$init();
    const opts = cli[$.opts];
    let cmd = cli[$.command];
    if (!cmd) {
      if (!opts.promptCommand) throw new Error('Invalid or undefined command');
      return this.prompt.select({
        message: 'Choose a command',
        choices: cli[$.commands].map(({ key, value }) => {
          let message = `${key}`;
          if (value.description) {
            message = value.description;
          }
          return { name: key, value, message };
        }),
        result(result) { return this.map(result)[result] }
      }).then((command) => {
        cli[$.command] = command;
        return this.run(cli, ...args);
      });
    };
    return _.try(() => cmd.handler.call(cli, ...args), error => {
      if (error) {
        process.exitCode = 1;
        throw error;
        // console.error(error);
      }
    });
  }

  $init(opts = {}) { return this.constructor.init(this, opts) }
  $run(...args) { return this.constructor.run(this, ...args) }
};
