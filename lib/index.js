const yargs = require('yargs');
const Config = require('configucius');
const _ = require('./utils');

class Option extends _.iClass {};
class Command extends _.iClass {};
const initialized = Symbol('initialized');
const command = Symbol('command');
const reset = Symbol('reset');

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
   * @param {function} [opts.yargs]
   */
  static init(cli, opts) {
    if (cli[initialized]) return;
    const options = [];
    for (const key of Object.getOwnPropertyNames(cli)) {
      const value = cli[key];
      if (value instanceof Option) {
        yargs.option(key, value);
        options.push(key);
        delete cli[key];
      } else if (value instanceof Command) {
        yargs.command({
          ...value,
          handler: () => _.define(cli, command, { value }),
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
    _.define(cli, initialized, { value: true });
  }
  static run(cli, ...args) {
    cli.$init();

    return _.try(() => cli[command].handler.call(cli, ...args), error => {
      if (error) {
        process.exitCode = 1;
        throw error;
        // console.error(error);
      }
    });

    const promise = {
      get then() {
        return (onFulfilled, onRejected) => {
          this.onFulfilled = onFulfilled;
          this.onRejected = onRejected;
        }
      },
      get catch() {
        return (onRejected) => {
          this.onRejected = onRejected;
        }
      },
    };

    try {
      const result = cli[command].handler.call(cli, ...args);
      if (result instanceof Promise) {
        result.then(result => {
          if (promise.onFulfilled) {
            promise.onFulfilled(result);
          }
        }, error => {
          process.exitCode = 1;
          if (promise.onRejected) {
            promise.onRejected(error);
          } else {
            console.error(error);
          }
        });
        return promise;
      } else {
        return result;
      }
    } catch (error) {
      process.exitCode = 1;
      throw error;
    }
  }

  $init(opts = {}) { return this.constructor.init(this, opts) }
  $run(...args) { return this.constructor.run(this, ...args) }
};
