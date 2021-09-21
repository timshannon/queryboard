// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { User } from "../../models/user";
import * as pwdSvc from "../../services/password";

import express from "express";
import * as fail from "../../fail";

export async function createPassword(req: express.Request, res: express.Response): Promise<void> {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    const user = await User.create(req.session, req.body.username, req.body.password, req.body.admin);

    res.status(201).send(user);
}

export async function get(req: express.Request, res: express.Response): Promise<void> {
    if (!req.session) {
        throw new fail.Unauthorized();
    }


    let username = req.params.username;

    if (!username) {
        username = req.session.username;
    }

    const user = await User.get(req.session, username);
    res.send(user);
}

export async function update(req: express.Request, res: express.Response): Promise<void> {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    const user = await User.get(req.session, req.params.username);

    await user.update(req.session, req.body);

    res.send();
}

export async function updatePassword(req: express.Request, res: express.Response): Promise<void> {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    const user = await User.get(req.session, req.params.username);

    await user.setPassword(req.session, req.body.newPassword, req.body.oldPassword);

    res.send();
}

export async function passwordTest(req: express.Request, res: express.Response): Promise<void> {

    // TODO: Rate limit requests
    await pwdSvc.validate(req.body.password);
    res.send();
}
