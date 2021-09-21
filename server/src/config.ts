// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import env from "dotenv";

env.config();

const config = {
    // web server port
    port: process.env.PORT || "8080",

    // directory for storing database files
    dataDir: process.env.DATADIR || "./data",

    // directory containing the static files of the html client
    clientDir: process.env.CLIENTDIR || "./client",

    // temporary password set for first user, if blank a random password will be generated
    startupPassword: process.env.STARTUPPASSWORD || "",

    // log level is what level of messages to show in the log
    logLevel: process.env.LOG_LEVEL || ((process.env.NODE_ENV === "production") ? "WARNING" : "DEBUG"),
};

export default config;

// function defaultBoolean(value: string | undefined, defaultValue: boolean): boolean {
//     if (value === undefined) {
//         return defaultValue;
//     }

//     if (value.toLowerCase() === "false" || value === "0" || value.toLowerCase() === "no") {
//         return false;
//     }
//     return true;
// }

