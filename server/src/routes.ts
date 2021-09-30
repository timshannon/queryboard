// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import express from "express";

import * as routes from "./route_validation";
import config from "./config";
import * as session from "./routes/v1/session";
import * as user from "./routes/v1/user";
import * as settings from "./routes/v1/settings";

const { route, body, param } = routes;

export default (app: express.Express): void => {
    app.use(express.static(config.clientDir));
    v1(app);
};

function v1(app: express.Express) {
    sessions(app);
    users(app);
    password(app);
    setting(app);
}

function sessions(app: express.Express) {
    route(app, false).post("/v1/sessions/password", session.passwordLogin,
        body("username").isRequired().isString().description("username"),
        body("password").isRequired().isString().description("password"));

    route(app).get("/v1/sessions/", session.get);

    route(app).delete("/v1/sessions/", session.logout,
        body("id").isString().description("optional session ID to log out, otherwise the current session will log out"),
    );
}


function users(app: express.Express) {
    // POST

    route(app, false).post("/v1/users/", user.createPassword,
        body("username").isRequired().isString().description("username of the user to create"),
        body("password").isRequired().isString().description("temp password for the new user"));

    // GET
    route(app).get("/v1/users", user.get);

    route(app).get("/v1/users/:username", user.get,
        param("username").isRequired().isString().description("username"));


    // PUT
    route(app).put("/v1/users/:username", user.update,
        param("username").isRequired().isString().description("username"),
        body("version").isRequired().isInt().description("user version"),
        body("startDate").isDate().description("updated start date of user, leave undefined if no change"),
        body("endDate").isDate().description("updated end date of user, leave undefined if no change"),
    );

    route(app).put("/v1/users/:username/password", user.updatePassword,
        param("username").isRequired().isString().description("username"),
        body("newPassword").isRequired().isString().description("new password"),
        body("oldPassword").isRequired().isString().description("old password"),
    );
}


function password(app: express.Express) {
    route(app, false).put("/v1/password", user.passwordTest,
        body("password").isRequired().isString().description("password to validate"),
    );
}

function setting(app: express.Express) {
    route(app).put("/v1/settings", settings.set,
        body("id").isRequired().isString().description("setting id"),
        body("value").isRequired().description("new value of setting"));
    route(app).delete("/v1/settings", settings.setDefault,
        body("id").isRequired().isString().description("restore setting to it's default value"));
}

