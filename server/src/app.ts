// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import config from "./config";
import routes from "./routes";
import { sysdb } from "./data/data";
import { User } from "./models/user";
import schema from "./data/schema";
import { ensureSchema } from "./data/schema_control";

import * as middleware from "./middleware";

import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

// Create Express server
const app = express();

// set middleware
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());
// app.use(middleware.session());
app.use(middleware.csrf);

// set routes
routes(app);

// set error handler last
app.use(middleware.errors);

// set config
app.set("port", config.port);

ensureSchema(sysdb, schema.system).then(async () => {
    await User.ensureAdmin();
    app.emit("ready");
}).catch((err) => {
    throw err;
});

export default app;

