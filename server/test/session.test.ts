// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
process.env.DATADIR = ":memory:";
process.env.STARTUPPASSWORD = "AdminPassword!1";

import app from "../src/app";
import { sysdb } from "../src/data/data";

import { addDays, isAfter, isBefore } from "date-fns";
import request from "supertest";

const user = {
    username: "admin",
    password: process.env.STARTUPPASSWORD,
};

beforeAll(async () => {
    const p = new Promise<void>((resolve) => {
        app.on("ready", () => {
            resolve();
        });
    });
    await p;
});

describe("POST /v1/sessions/password", () => {
    it("should require username and password", async () => {
        const res = await request(app).post("/v1/sessions/password");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "The field 'username' is required" });
    });

    it("it should fail with an incorrect username", async () => {
        const res = await request(app).post("/v1/sessions/password")
            .send({
                username: "badusername",
                password: user.password,
            });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid user or password" });
    });

    it("it should fail with an incorrect password", async () => {
        const res = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: "badPassword",
            });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid user or password" });

    });

    it("it should succeed with the correct email and password", async () => {
        const res = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: user.password,
            });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body).toHaveProperty("csrfToken");
        expect(res.body).toHaveProperty("expires");
        expect(isBefore(new Date(res.body.expires), addDays(new Date(), 2))).toBeTruthy();
    });

    it("it should have a longer expiration for 'rememberMe' sessions", async () => {
        const res = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: user.password,
                rememberMe: true,
            });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body).toHaveProperty("csrfToken");
        expect(res.body).toHaveProperty("expires");
        expect(isAfter(new Date(res.body.expires), addDays(new Date(), 2))).toBeTruthy();
    });

    describe("inactive users", () => {
        afterEach(async () => {
            await sysdb.query("update users set start_date = $start, end_date = $end where username = $username",
                { $start: addDays(new Date(), -1), $end: null, $username: user.username });
        });

        it("should not allow a logon if user hasn't started yet", async () => {
            await sysdb.query("update users set start_date = $start where username = $username",
                { $start: addDays(new Date(), 1), $username: user.username });
            const res = await request(app).post("/v1/sessions/password")
                .send({
                    username: user.username,
                    password: user.password,
                });
            expect(res.status).toBe(400);
        });

        it("should not allow a logon if user has been ended", async () => {
            await sysdb.query("update users set end_date = $end where username = $username",
                { $end: addDays(new Date(), -1), $username: user.username });
            const res = await request(app).post("/v1/sessions/password")
                .send({
                    username: user.username,
                    password: user.password,
                });
            expect(res.status).toBe(400);
        });
    });
});

// describe("GET /v1/sessions/", () => {
//     it("should not retrieve a session if not logged in", async () => {
//         const res = await request(app).get("/v1/sessions");
//         expect(res.status).toBe(401); // Unauthorized
//     });

//     it("should retrieve a valid session with bearer token", async () => {
//         const auth = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(auth.status).toBe(201);

//         const res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`);
//         expect(res.status).toBe(200);
//         expect(res.body).toHaveProperty("id");
//         expect(res.body).toHaveProperty("csrfToken");
//         expect(res.body).toHaveProperty("expires");
//     });

//     it("should retrieve a valid session with signed token", async () => {
//         const auth = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(auth.status).toBe(201);
//         let res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`);

//         const csrf = res.get("X-CSRFToken");

//         res = await request(app).post("/v1/sessions/token")
//             .set("Authorization", `Bearer ${auth.body.id}`)
//             .set("X-CSRFToken", csrf);
//         expect(res.status).toBe(201);

//         const token = res.body.token;

//         res = await request(app).get(`/v1/sessions?authorization=${token}`);
//         expect(res.status).toBe(200);
//         expect(res.body).toHaveProperty("id");
//         expect(res.body).toHaveProperty("csrfToken");
//         expect(res.body).toHaveProperty("expires");
//     });
// });

// describe("POST /v1/sessions/actions", () => {
//     const tester = {
//         id: null,
//         email: "tester@test.com",
//         password: "testerP@ssword",
//         token: "",
//         csrf: "",
//         actions: [
//             "test:action:view",
//             "test:action:update",
//             "test:action:register",
//         ],
//     };

//     beforeAll(async () => {
//         await bulk(undefined, undefined, [tester]);

//         let res = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: tester.email,
//                 password: tester.password,
//             });
//         expect(res.status).toBe(201);

//         tester.token = res.body.id;

//         res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${tester.token}`);

//         tester.csrf = res.get("X-CSRFToken");
//     });

//     it("should require a session", async () => {
//         const res = await request(app).post("/v1/sessions/actions")
//             .send({ action: "blah:blah:blah" });
//         expect(res.status).toBe(401);
//     });

//     it("should require the field 'action'", async () => {
//         const res = await request(app).post("/v1/sessions/actions")
//             .set("Authorization", `Bearer ${tester.token}`)
//             .set("X-CSRFToken", tester.csrf);
//         expect(res.status).toBe(400);
//         expect(res.body).toHaveProperty("message");
//         expect(res.body.message).toBe("The field 'action' is required");
//     });

//     it("should return unauthorized if the user does not have an action", async () => {
//         const res = await request(app).post("/v1/sessions/actions")
//             .set("Authorization", `Bearer ${tester.token}`)
//             .set("X-CSRFToken", tester.csrf)
//             .send({ action: "bad:action:view" });
//         expect(res.status).toBe(401);
//     });

//     it("should succeed if a user has an action", async () => {
//         const res = await request(app).post("/v1/sessions/actions")
//             .set("Authorization", `Bearer ${tester.token}`)
//             .set("X-CSRFToken", tester.csrf)
//             .send({ action: tester.actions[0] });
//         expect(res.status).toBe(200);
//     });

//     it.each<[number, string | string[]]>([
//         [401, ["bad:action:view", tester.actions[0]]],
//         [401, ["bad:action:view", "another:bad:action"]],
//         [401, "single:bad:action"],
//         [200, tester.actions[1]],
//         [200, tester.actions],
//     ])("should return a status %d for actions %s", async (status, actions) => {
//         const res = await request(app).post("/v1/sessions/actions")
//             .set("Authorization", `Bearer ${tester.token}`)
//             .set("X-CSRFToken", tester.csrf)
//             .send({ action: actions });
//         expect(res.status).toBe(status);
//     });

// });

// describe("DELETE /v1/sessions/", () => {
//     it("should fail if not logged in", async () => {
//         const res = await request(app).delete("/v1/sessions");
//         expect(res.status).toBe(401);
//     });

//     it("should log out the current session", async () => {
//         const auth = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(auth.status).toBe(201);

//         let res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`);

//         res = await request(app).delete("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`)
//             .set("X-CSRFToken", res.get("X-CSRFToken"));
//         expect(res.status).toBe(200);

//         res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`);
//         expect(res.status).toBe(401); // Unauthorized
//     });

//     it("should log out any valid session", async () => {
//         const auth = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(auth.status).toBe(201);

//         let res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`);

//         const csrfToken = res.get("X-CSRFToken");

//         // log into another session
//         const other = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(other.status).toBe(201);

//         res = await request(app).delete("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`)
//             .set("X-CSRFToken", csrfToken)
//             .send({ id: other.body.id });
//         expect(res.status).toBe(200);

//         res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${other.body.id}`);
//         expect(res.status).toBe(401); // Unauthorized

//         res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${auth.body.id}`);
//         expect(res.status).toBe(200); // original session still valid
//     });

// });

// describe("GET /v1/sessions/actions", () => {
//     const tester = {
//         id: null,
//         email: "tester@test.com",
//         password: "testerP@ssword",
//         token: "",
//         csrf: "",
//         actions: [
//             "test:action:view",
//             "test:action:update",
//             "test:action:register",
//         ],
//     };

//     beforeAll(async () => {
//         await bulk(undefined, undefined, [tester]);

//         let res = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: tester.email,
//                 password: tester.password,
//             });
//         expect(res.status).toBe(201);

//         tester.token = res.body.id;

//         res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${tester.token}`);

//         tester.csrf = res.get("X-CSRFToken");
//     });

//     it("should reqire a session", async () => {
//         const res = await request(app).get("/v1/sessions/actions");
//         expect(res.status).toBe(401);
//     });

//     it("should a list of actions for the current session's user", async () => {
//         const res = await request(app).get("/v1/sessions/actions")
//             .set("Authorization", `Bearer ${tester.token}`);

//         expect(res.status).toBe(200);
//         expect(res.body).toEqual(tester.actions);
//     });
// });

// describe("GET /v1/sessions/history", () => {
//     it("should require a session", async () => {
//         const res = await request(app).get("/v1/sessions/history");
//         expect(res.status).toBe(401);
//     });

//     it("should retrieve session history", async () => {
//         const auth = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(auth.status).toBe(201);

//         const res = await request(app).get("/v1/sessions/history")
//             .set("Authorization", `Bearer ${auth.body.id}`);
//         expect(res.status).toBe(200);
//         expect(res.body).toHaveProperty("data");
//         expect(res.body).toHaveProperty("page");
//         expect(res.body).toHaveProperty("total");
//         expect(res.body).toHaveProperty("pages");
//         expect(res.body.data[0]).toHaveProperty("userID");
//         expect(res.body.data[0]).toHaveProperty("authType");
//         expect(res.body.data[0]).toHaveProperty("valid");
//         expect(res.body.data[0]).toHaveProperty("ipAddress");
//         expect(res.body.data[0]).toHaveProperty("expires");
//         expect(res.body.data[0]).toHaveProperty("userAgent");
//         expect(res.body.data[0]).toHaveProperty("createdDate");
//         expect(res.body.data[0].userID).toBe(user.id);
//         expect(res.body.data[0].ipAddress).toBe(auth.body.ipAddress);
//         expect(res.body.data[0].userAgent).toBe(auth.body.userAgent);
//     });
// });

// describe("POST /v1/sessions/token", () => {
//     it("should require a session", async () => {
//         const res = await request(app).post("/v1/sessions/token");
//         expect(res.status).toBe(401);
//     });

//     it("should require a valid session", async () => {
//         const res = await request(app).post("/v1/sessions/token")
//             .set("Authorization", `Bearer ${data.random(256)}`);
//         expect(res.status).toBe(401);
//     });

//     it("should create a short lived signed token", async (done) => {
//         let res = await request(app).post("/v1/sessions/password")
//             .send({
//                 email: user.email,
//                 password: user.password,
//             });
//         expect(res.status).toBe(201);

//         const sessionID = res.body.id;

//         res = await request(app).get("/v1/sessions")
//             .set("Authorization", `Bearer ${sessionID}`);

//         const csrf = res.get("X-CSRFToken");

//         res = await request(app).post("/v1/sessions/token")
//             .set("Authorization", `Bearer ${sessionID}`)
//             .set("X-CSRFToken", csrf);

//         expect(res.status).toBe(201);

//         const token = res.body.token;

//         res = await request(app).get(`/v1/sessions?authorization=${token}`);
//         expect(res.status).toBe(200);
//         expect(res.body).toHaveProperty("id");
//         expect(res.body).toHaveProperty("csrfToken");
//         expect(res.body).toHaveProperty("expires");

//         setTimeout(async () => {
//             // should expire after 2 seconds
//             res = await request(app).get(`/v1/sessions?authorization=${token}`);
//             expect(res.status).toBe(401);
//             done();
//         }, 2100);
//     });
// });

