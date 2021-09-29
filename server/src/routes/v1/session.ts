// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { Password } from "../../models/password";
import { Session } from "../../models/session";

import express from "express";
import * as fail from "../../fail";

export function passwordLogin(req: express.Request, res: express.Response): void {
    const rememberMe = req.body.rememberMe || false;

    const session = Password.login(req.body.username, req.body.password, rememberMe, req.ip, req.get("User-Agent"));
    res.status(201).send(session);
}

export function get(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.NotFound("No valid session found");
    }

    res.send(req.session);
}

export function logout(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    let sessionID = req.body.id;
    if (!sessionID) {
        sessionID = req.session.id;
    }

    const s = Session.get(sessionID);

    if (s) {
        s.logout();
    }
    res.send();
}

