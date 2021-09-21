// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import "source-map-support/register"; // gives us stack line numbers in ts code

import config from "./config";

enum level {
    ERROR = "ERROR",
    WARNING = "WARNING",
    INFO = "INFO",
    DEBUG = "DEBUG",
    NONE = "NONE",
}

const COLOR_RED = "\x1b[31m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_CYAN = "\x1b[36m";
const COLOR_RESET = "\x1b[0m";

export default {
    error: (err: Error) => {
        log(level.ERROR, err.message, err.stack);
    },
    warning: (err: Error) => {
        log(level.WARNING, err.message, err.stack);
    },
    info: (entry: string) => {
        log(level.INFO, entry);
    },
    debug: (entry: string) => {
        log(level.DEBUG, entry);
    },
};

function shouldLog(logLevel: level): boolean {
    if (config.logLevel === level.NONE) {
        return false;
    }

    if (config.logLevel === level.DEBUG) {
        return true;
    }

    if (config.logLevel === level.INFO) {
        if (logLevel !== level.DEBUG) {
            return true;
        }
        return false;
    }

    if (config.logLevel === level.WARNING) {
        if (logLevel === level.WARNING || logLevel === level.ERROR) {
            return true;
        }
        return false;
    }

    if (config.logLevel === level.ERROR) {
        if (logLevel === level.ERROR) {
            return true;
        }
        return false;
    }

    // unknown log level config, default to logging warnings and errors
    if (logLevel === level.WARNING || logLevel === level.ERROR) {
        return true;
    }
    return false;

}


function log(logLevel: level, message: string, stack?: string) {
    if (!shouldLog(logLevel)) {
        return;
    }

    let logFunc;

    if (logLevel === level.ERROR) {
        logFunc = (msg: string) => { console.error(`${COLOR_RED}${msg}${COLOR_RESET}`); };
    } else if (logLevel === level.WARNING) {
        logFunc = (msg: string) => { console.warn(`${COLOR_YELLOW}${msg}${COLOR_RESET}`); };
    } else if (logLevel === level.INFO) {
        logFunc = (msg: string) => { console.log(`${COLOR_CYAN}${msg}${COLOR_RESET}`); };
    } else {
        logFunc = console.log;
    }

    let logMsg = `[${new Date().toLocaleString()}] - ${message}`;

    if (stack) {
        logMsg += `\n\tSTACK: ${stack}`;
    }

    logFunc(logMsg);
}

