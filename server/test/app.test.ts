// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

process.env.DATADIR = ":memory:";
import app from "../src/app";
import { sysdb } from "../src/data/data";

import request from "supertest";

beforeAll(async () => {
    const p = new Promise<void>((resolve) => {
        app.on("ready", () => {
            resolve();
        });
    });
    await p;
});

describe("GET /random-url", () => {
    it("should return 404", (done) => {
        request(app).get("/blah")
            .expect(404, done);
    });

    it("should ensure schema", async () => {
        const res = await sysdb.query(`
            SELECT name 
            FROM sqlite_master
            WHERE type='table'
            and name = 'users'
        `);
        expect(res.length).toBe(1);
    });

});

