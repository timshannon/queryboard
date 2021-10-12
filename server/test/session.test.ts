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
        expect(isBefore(new Date(res.body.expires as string), addDays(new Date(), 2))).toBeTruthy();
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
        expect(isAfter(new Date(res.body.expires as string), addDays(new Date(), 2))).toBeTruthy();
    });

    describe("inactive users", () => {
        afterEach(() => {
            sysdb.query("update users set start_date = $start, end_date = $end where username = $username",
                { start: addDays(new Date(), -1), end: null, username: user.username });
        });

        it("should not allow a logon if user hasn't started yet", async () => {
            sysdb.query("update users set start_date = $start where username = $username",
                { start: addDays(new Date(), 1), username: user.username });
            const res = await request(app).post("/v1/sessions/password")
                .send({
                    username: user.username,
                    password: user.password,
                });
            expect(res.status).toBe(400);
        });

        it("should not allow a logon if user has been ended", async () => {
            sysdb.query("update users set end_date = $end where username = $username",
                { end: addDays(new Date(), -1), username: user.username });
            const res = await request(app).post("/v1/sessions/password")
                .send({
                    username: user.username,
                    password: user.password,
                });
            expect(res.status).toBe(400);
        });
    });
});

describe("GET /v1/sessions/", () => {
    it("should not retrieve a session if not logged in", async () => {
        const res = await request(app).get("/v1/sessions");
        expect(res.status).toBe(401); // Unauthorized
    });

    it("should retrieve a valid session with bearer token", async () => {
        const auth = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: user.password,
            });
        expect(auth.status).toBe(201);

        const res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("id");
        expect(res.body).toHaveProperty("csrfToken");
        expect(res.body).toHaveProperty("expires");
    });
});

describe("DELETE /v1/sessions/", () => {
    it("should fail if not logged in", async () => {
        const res = await request(app).delete("/v1/sessions");
        expect(res.status).toBe(401);
    });

    it("should log out the current session", async () => {
        const auth = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: user.password,
            });
        expect(auth.status).toBe(201);

        let res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`);

        res = await request(app).delete("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`)
            .set("X-CSRFToken", res.get("X-CSRFToken"));
        expect(res.status).toBe(200);

        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`);
        expect(res.status).toBe(401); // Unauthorized
    });

    it("should log out any valid session", async () => {
        const auth = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: user.password,
            });
        expect(auth.status).toBe(201);

        let res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`);

        const csrfToken = res.get("X-CSRFToken");

        // log into another session
        const other = await request(app).post("/v1/sessions/password")
            .send({
                username: user.username,
                password: user.password,
            });
        expect(other.status).toBe(201);

        res = await request(app).delete("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`)
            .set("X-CSRFToken", csrfToken)
            .send({ id: other.body.id });
        expect(res.status).toBe(200);

        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${other.body.id}`);
        expect(res.status).toBe(401); // Unauthorized

        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${auth.body.id}`);
        expect(res.status).toBe(200); // original session still valid
    });

});

