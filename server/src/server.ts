// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import app from "./app";
import log from "./log";

/**
 * Start Express server.
 */
let server;

app.on("ready", () => {
    server = app.listen(app.get("port"), () => {
        log.info(`The QueryBoard server is running on port ${app.get("port") as string}`);
        log.info("Press CTRL-C to stop");
    });
});

export default server;

