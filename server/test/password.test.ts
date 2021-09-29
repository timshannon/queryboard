// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

process.env.DATADIR = ":memory:";
process.env.STARTUPPASSWORD = "AdminPassword!1";

import app from "../src/app";
import { sysdb } from "../src/data/data";

import { addDays } from "date-fns";
import request from "supertest";

const admin = {
    username: "admin",
    password: process.env.STARTUPPASSWORD,
    token: "",
    csrf: "",
};

beforeAll(async () => {
    // admin
    let res = await request(app).post("/v1/sessions/password")
        .send({
            username: admin.username,
            password: admin.password,
        });
    expect(res.status).toBe(201);

    admin.token = res.body.id;

    res = await request(app).get("/v1/sessions")
        .set("Authorization", `Bearer ${admin.token}`);

    admin.csrf = res.get("X-CSRFToken");

});


describe("PUT /v1/users/:id/password", () => {
    const tester = {
        username: "tester",
        password: "testerP@ssword",
        token: "",
        csrf: "",
    };

    beforeAll(async () => {

        // create user
        await request(app).post("/v1/users/")
            .set("Authorization", `Bearer ${admin.token}`)
            .set("X-CSRFToken", admin.csrf)
            .send({
                username: tester.username,
                password: tester.password,
            });


        let res = await request(app).post("/v1/sessions/password")
            .send({
                username: tester.username,
                password: tester.password,
            });
        expect(res.status).toBe(201);

        tester.token = res.body.id;

        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${tester.token}`);

        tester.csrf = res.get("X-CSRFToken");
    });

    it("should require a session", async () => {
        const res = await request(app).put(`/v1/users/${tester.username}/password`)
            .send({
                newPassword: "test",
                oldPassword: "test",
            });
        expect(res.status).toBe(401);
    });

    it("should require the fields newPassword and oldPassword", async () => {
        let res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf);
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("The field 'newPassword' is required");

        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                newPassword: "The new password",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("The field 'oldPassword' is required");
    });

    it("should require a non empty old password when set by self", async () => {
        const res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: "",
                newPassword: "The new password",
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("The field 'oldPassword' is required");
    });

    it("should require a valid old password when set by self", async () => {
        const res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: "badoldpassword",
                newPassword: "The new password",
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Your old password is incorrect");
    });

    it("should not update a password if old password is expired", async () => {
        sysdb.query("update passwords set expiration = $expiration where username = $username",
            { expiration: addDays(new Date(), -1), username: tester.username });

        const res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: tester.password,
                newPassword: "The new password",
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Your password has expired");
        sysdb.query("update passwords set expiration = $expiration where username = $username",
            { expiration: null, username: tester.username });

    });

    it("should require new passwords to follow password validation", async () => {
        const res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: tester.password,
                newPassword: "password",
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Passwords must be at least 10 characters long");
    });

    it("should require your new password to be different from your old password", async () => {
        const res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: tester.password,
                newPassword: tester.password,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Your new password cannot match your previous password");
    });

    it("should set a new password", async () => {
        const newPassword = "p@sswordN3wThe";
        let res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: tester.password,
                newPassword,
            });

        expect(res.status).toBe(200);
        tester.password = newPassword;

        res = await request(app).post("/v1/sessions/password")
            .send({
                username: tester.username,
                password: tester.password,
            });
        expect(res.status).toBe(201);

        tester.token = res.body.id;

        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${tester.token}`);

        tester.csrf = res.get("X-CSRFToken");
    });

    it("should not allow reusing old passwords", async () => {
        const pass1 = "firstPassword";
        const pass2 = "secondPassword";
        const pass3 = "thirdPassword";

        let res = await request(app).put("/v1/settings")
            .set("Authorization", `Bearer ${admin.token}`)
            .set("X-CSRFToken", admin.csrf)
            .send({ id: "password.reuseCheck", value: 2 });
        expect(res.status).toBe(200);

        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: tester.password,
                newPassword: pass1,
            });

        expect(res.status).toBe(200);

        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: pass1,
                newPassword: pass2,
            });

        expect(res.status).toBe(200);

        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: pass2,
                newPassword: tester.password,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Your new password cannot match your previous 3 passwords");

        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: pass2,
                newPassword: pass1,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Your new password cannot match your previous 3 passwords");

        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: pass2,
                newPassword: pass3,
            });

        expect(res.status).toBe(200);
        tester.password = pass3;

    });

    it("should invalidate all other sessions when changing a password", async () => {
        let res = await request(app).post("/v1/sessions/password")
            .send({
                username: tester.username,
                password: tester.password,
            });
        expect(res.status).toBe(201);

        const otherToken = res.body.id;

        // confirm session is valid
        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.status).toBe(200);

        // change password
        const newPassword = "p@sswordN3wThe";
        res = await request(app).put(`/v1/users/${tester.username}/password`)
            .set("Authorization", `Bearer ${tester.token}`)
            .set("X-CSRFToken", tester.csrf)
            .send({
                oldPassword: tester.password,
                newPassword,
            });

        expect(res.status).toBe(200);
        tester.password = newPassword;

        res = await request(app).post("/v1/sessions/password")
            .send({
                username: tester.username,
                password: tester.password,
            });
        expect(res.status).toBe(201);

        tester.token = res.body.id;

        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${tester.token}`);

        tester.csrf = res.get("X-CSRFToken");

        // confirm other session is now invalid
        res = await request(app).get("/v1/sessions")
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.status).toBe(401);
    });

});

