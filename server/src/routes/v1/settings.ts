// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import settings, { ISetting } from "../../models/settings";
import { Session } from "../../models/session";
import * as fail from "../../fail";

import express from "express";

function setSetting(session: Session, id: string, value?: any) {
    const keys = id.split(".");
    /* eslint @typescript-eslint/no-explicit-any: "off" */
    let setting: any = settings;

    for (const key of keys) {
        setting = setting[key];
        if (!setting) {
            throw new fail.NotFound(`No setting found with an id of ${id}`);
        }
    }

    const user = session.user();
    (setting as ISetting<unknown>).set(user, value);
}


export function set(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    setSetting(req.session, req.body.id, req.body.value);
    res.send();
}

export function setDefault(req: express.Request, res: express.Response): void {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    setSetting(req.session, req.body.id);
    res.send();
}

