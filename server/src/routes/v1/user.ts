// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { User } from "../../models/user";
import * as pwdSvc from "../../services/password";

import express from "express";
import * as fail from "../../fail";

export function createPassword(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    const user = User.create(req.session, req.body.username, req.body.password, req.body.admin);

    res.status(201).send(user);
}

export function get(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }


    let username = req.params.username;

    if (!username) {
        username = req.session.user().username;
    }

    const user = User.get(req.session, username);
    res.send(user);
}

export function update(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    const user = User.get(req.session, req.params.username);

    user.update(req.session, req.body);

    res.send();
}

export function updatePassword(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    const user = User.get(req.session, req.params.username);

    user.setPassword(req.session, req.body.newPassword, req.body.oldPassword);

    res.send();
}

export function passwordTest(req: express.Request, res: express.Response): void {
    // TODO: Rate limit requests
    pwdSvc.validate(req.body.password);
    res.send();
}
