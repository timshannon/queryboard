// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

// import * as routes from "./route_validation";

import express from "express";

// const { route, body } = routes;

export default (app: express.Express) => {
    v1(app);
};

function v1(app: express.Express) {
    // route(app).
    // route(app).post("/v1/emails", email.send,
    //     body("to").isString().isRequired().description("Semi-colon delimited list of emails to send to"),
    //     body("subject").isString().isRequired().description("Subject of the email"),
    //     body("body").isString().isRequired().description("Body of the email"),
    //     body("cc").isString().description("Email cc field"),
    //     body("bcc").isString().description("Email bcc field"),
    //     body("html").isBoolean().description("Whether or not the body contains html"),
    // );
}

