// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import env from "dotenv";

env.config();

const config = {
    port: process.env.PORT || "8080", // web server port
    dataDir: process.env.DATADIR || "./data", // directory for storing database files
    clientDir: process.env.CLIENTDIR || "./client", // directory containing the static files of the html client
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

