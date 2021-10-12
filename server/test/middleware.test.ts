// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
process.env.DATADIR = ":memory:";
process.env.STARTUPPASSWORD = "AdminPassword!1";

import * as fail from "../src/fail";
import * as middleware from "../src/middleware";
import log from "../src/log";
import { Password } from "../src/models/password";
import { User } from "../src/models/user";

import express from "express";
import request from "supertest";

const admin = {
    username: "admin",
    password: process.env.STARTUPPASSWORD,
    sessionID: "",
};

beforeAll(() => {
    User.ensureAdmin();
});

describe("session middleware", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(middleware.session());

        app.get("/", (req: express.Request, res: express.Response) => {
            res.json(req.session);
        });

        // login admin
        admin.sessionID = Password.login(admin.username, admin.password, false, "127.0.0.1").id;
    });


    it("it should not have a session without bearer token", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.body).toBe("");
    });

    it("it should get a session from the Authorization Header", async () => {
        const res = await request(app).get("/")
            .set("Authorization", `Bearer ${admin.sessionID}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("id");
        expect(res.body).toHaveProperty("csrfToken");
        expect(res.body.id).toBe(admin.sessionID);
    });

});

describe("errors middleware", () => {
    let app: express.Application;
    let errFunc: () => void;

    let spyLogError: jest.SpyInstance;
    let spyLogWarning: jest.SpyInstance;
    let spyLogInfo: jest.SpyInstance;
    let spyLogDebug: jest.SpyInstance;

    beforeEach(() => {
        app = express();
        spyLogError = jest.spyOn(log, "error");
        spyLogWarning = jest.spyOn(log, "warning");
        spyLogInfo = jest.spyOn(log, "info");
        spyLogDebug = jest.spyOn(log, "debug");

        app.get("/", (_: express.Request, res: express.Response) => {
            errFunc();
            res.status(200);
        });

        app.use(middleware.errors);
    });

    afterEach(() => {
        spyLogError.mockRestore();
        spyLogWarning.mockRestore();
        spyLogInfo.mockRestore();
        spyLogDebug.mockRestore();
    });

    it("should return 500 and log errors", async () => {
        const err = new Error("Test Middleware Error");
        errFunc = () => {
            throw err;
        };


        const res = await request(app).get("/");
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe(err.message);

        // clients don't wait on logging, so we need to sleep a bit to make sure the error gets logged to the DB
        const p = new Promise<void>((resolve) => {
            setTimeout(() => {
                expect(spyLogError).toHaveBeenCalled();
                resolve();
            }, 500);
        });
        await p;
    });

    it("should return 400 and log warnings", async () => {
        const err = new fail.Failure("Test Middleware Failure");
        errFunc = () => {
            throw err;
        };

        const res = await request(app).get("/");
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe(err.message);

        // clients don't wait on logging, so we need to sleep a bit to make sure the error gets logged to the DB
        const p = new Promise<void>((resolve) => {
            setTimeout(() => {
                expect(spyLogWarning).toHaveBeenCalled();
                resolve();
            }, 500);
        });
        await p;
    });

    it("should return proper failure status codes", async () => {
        const err = new fail.Conflict("Test Middleware Conflict");
        errFunc = () => {
            throw err;
        };

        const res = await request(app).get("/");
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe(err.message);
    });

    it("should return 400 for json parsing errors", async () => {
        errFunc = () => {
            JSON.parse("{bad jSON");
        };

        const res = await request(app).get("/");
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

});

describe("csrf middleware", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(middleware.session());
        app.use(middleware.csrf);

        app.get("/", (_: express.Request, res: express.Response) => {
            res.send();
        });
        app.put("/", (_: express.Request, res: express.Response) => {
            res.send();
        });

        app.use(middleware.errors);

        // login admin
        admin.sessionID = Password.login(admin.username, admin.password, false, "127.0.0.1").id;
    });

    it("should not have a csrf token header without a session", async () => {
        const res = await request(app).get("/").expect(200);
        expect(res.get("X-CSRFToken")).toBe(undefined);
    });

    it("should have a csrf token header on GET with a session", async () => {
        const res = await request(app).get("/")
            .set("Authorization", `Bearer ${admin.sessionID}`);
        expect(res.status).toBe(200);
        expect(res.get("X-CSRFToken")).not.toBe(undefined);
    });

    it("should require a CSRF token on updates", async () => {
        const res = await request(app).put("/")
            .set("Authorization", `Bearer ${admin.sessionID}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Invalid CSRFToken.  Please refresh and try again");
    });

    it("should succeed on updates if csrf tokens match", async () => {
        const gRes = await request(app).get("/")
            .set("Authorization", `Bearer ${admin.sessionID}`);

        const res = await request(app).put("/")
            .set("Authorization", `Bearer ${admin.sessionID}`)
            .set("X-CSRFToken", gRes.get("X-CSRFToken"));

        expect(res.status).toBe(200);
    });
});

