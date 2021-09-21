// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import settings from "../../models/settings";
import { Session } from "../../models/session";
import * as fail from "../../fail";

import express from "express";

async function setSetting(session: Session, id: string, value?: any) {
    const keys = id.split(".");
    let setting: any = settings;

    for (const key of keys) {
        setting = setting[key];
        if (!setting) {
            throw new fail.NotFound(`No setting found with an id of ${id}`);
        }
    }

    await setting.set(session, value);
}

export async function set(req: express.Request, res: express.Response) {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    await setSetting(req.session, req.body.id, req.body.value);
    res.send();
}

export async function setDefault(req: express.Request, res: express.Response) {
    if (!req.session) {
        throw new fail.Unauthorized();
    }

    await setSetting(req.session, req.body.id);
    res.send();
}

