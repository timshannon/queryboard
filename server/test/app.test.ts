// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

process.env.DATADIR = ":memory:";
process.env.STARTUPPASSWORD = "AdminPassword";

import app from "../src/app";
import { sysdb } from "../src/data/data";

import userSQL from "../src/models/user_sql";

import request from "supertest";

describe("GET /random-url", () => {
    it("should return 404", () => {
        return request(app).get("/blah")
            .expect(404);
    });

    it("should ensure schema", () => {
        const res = sysdb.query(`
            SELECT name 
            FROM sqlite_master
            WHERE type='table'
            and name = 'users'
        `);
        expect(res.length).toBe(1);
    });

    it("should ensure create an admin if no users exist", () => {
        const res = userSQL.user.count();
        const usr = userSQL.user.get({ username: "admin" });

        expect(res.length).toBe(1);
        expect(res[0].count).toBe(1);
        expect(usr.length).toBe(1);
        expect(usr[0].admin).toBeTruthy();
        expect(usr[0].username).toBe("admin");
    });

});

