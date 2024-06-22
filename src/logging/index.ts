import chalk, { type ChalkInstance } from "chalk";
import util from "util";

export type LogLevelValue = 0 | 1 | 2 | 3 | 4 | 5;
export const LogLevel = {
  TRACE: 0 as LogLevelValue,
  DEBUG: 1 as LogLevelValue,
  INFO: 2 as LogLevelValue,
  WARN: 3 as LogLevelValue,
  ERROR: 4 as LogLevelValue,
  SILENT: 5 as LogLevelValue,
};

export type LogLevel = keyof typeof LogLevel;
export const supportedLogLevels = Object.keys(LogLevel);

interface Logger {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

class RootLogger implements Logger {
  private level: LogLevelValue = LogLevel.INFO;

  setLevel(level: LogLevelValue) {
    this.level = level;
  }

  trace(message: string, ...args: any[]) {
    this.log("TRACE", chalk.cyan.bold, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log("DEBUG", chalk.blue.bold, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log("INFO", chalk.green.bold, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log("WARN", chalk.yellow.bold, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log("ERROR", chalk.red.bold, message, ...args);
  }

  childLogger(name: string): Logger {
    const childPrefix = chalk.white.bold(`(${name})`);
    const wrapMessage = (message: string) => `${childPrefix} ${message}`;

    return {
      trace: (message: string, ...args: any[]) =>
        this.trace(wrapMessage(message), ...args),
      debug: (message: string, ...args: any[]) =>
        this.debug(wrapMessage(message), ...args),
      info: (message: string, ...args: any[]) =>
        this.info(wrapMessage(message), ...args),
      warn: (message: string, ...args: any[]) =>
        this.warn(wrapMessage(message), ...args),
      error: (message: string, ...args: any[]) =>
        this.error(wrapMessage(message), ...args),
    };
  }

  private log(
    level: LogLevel,
    levelColor: ChalkInstance,
    message: string,
    ...args: any[]
  ) {
    const levelValue = LogLevel[level];
    if (levelValue < this.level) {
      return;
    }

    const formattedLevel = levelColor.call(this, `[${level}]`);
    const formattedMessage = `${formattedLevel} ${chalk.white(message)}`;
    const formattedArgs = args.map((arg) =>
      chalk.white(util.inspect(arg, false, null, true)),
    );

    // always write to stderr to allow redirecting stdout to a file (stderr is also fine for diagnostics)
    console.error.call(console, formattedMessage, ...formattedArgs);
  }
}

export const logger = new RootLogger();
