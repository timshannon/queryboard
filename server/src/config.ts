// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import env from "dotenv";

env.config();

const config = {
    port: process.env.PORT || "8080", // web server port
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

