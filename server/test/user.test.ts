// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
process.env.DATADIR = ":memory:";
process.env.STARTUPPASSWORD = "AdminPassword!1";

import app from "../src/app";

import request from "supertest";

const otherUser = {
    username: "other",
    password: "0therPassword",
    token: "",
    csrf: "",
};

const admin = {
    username: "admin",
    password: process.env.STARTUPPASSWORD,
    token: "",
    csrf: "",
};

beforeAll(async () => {
    // login admin
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


    // add other user
    await request(app).post("/v1/users/")
        .set("Authorization", `Bearer ${admin.token}`)
        .set("X-CSRFToken", admin.csrf)
        .send({
            username: otherUser.username,
            password: otherUser.password,
        });


    res = await request(app).post("/v1/sessions/password")
        .send({
            username: otherUser.username,
            password: otherUser.password,
        });
    expect(res.status).toBe(201);

    otherUser.token = res.body.id;

    res = await request(app).get("/v1/sessions")
        .set("Authorization", `Bearer ${otherUser.token}`);

    otherUser.csrf = res.get("X-CSRFToken");
});

async function setSetting(id: string, value: unknown): Promise<void> {
    const res = await request(app).put("/v1/settings")
        .set("Authorization", `Bearer ${admin.token}`)
        .set("X-CSRFToken", admin.csrf)
        .send({ id, value });
    expect(res.status).toBe(200);
}

async function setDefault(id: string): Promise<void> {
    const res = await request(app).delete("/v1/settings")
        .set("Authorization", `Bearer ${admin.token}`)
        .set("X-CSRFToken", admin.csrf)
        .send({
            id,
        });
    expect(res.status).toBe(200);
}


describe("POST /v1/users/", () => {
    describe("password and auth settings", () => {
        afterEach(async () => {
            // set password settings to defaults
            await Promise.all([
                setDefault("password.badCheck"),
                setDefault("password.minLength"),
                setDefault("password.requireSpecial"),
                setDefault("password.requireNumber"),
                setDefault("password.requireMixedCase"),
            ]);
        });

        it("should require the password field", async () => {
            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "blah",
                });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The field 'password' is required");
        });


        it("should require the username field", async () => {
            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    password: "newPassword!",
                });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The field 'username' is required");
        });

        it("should not allow a bad password", async () => {
            await setSetting("password.badCheck", true);

            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "newUser",
                    password: "qwerty123456789",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("This password is too common and insecure, please choose another");
        });

        it("should enforce a minimum password length", async () => {
            await setSetting("password.minLength", 10);
            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "newUser",
                    password: "$ffda#1",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("Passwords must be at least 10 characters long");
        });

        it("should require a special character", async () => {
            await setSetting("password.requireSpecial", true);
            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "newUser",
                    password: "correcthorsebatterystaple",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The password must contain at least one special character");
        });

        it("should require a number", async () => {
            await setSetting("password.requireNumber", true);

            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "newUser",
                    password: "correcthorsebatterystaple",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The password must contain at least one number");
        });

        it("should require mixed case", async () => {
            await setSetting("password.requireMixedCase", true);
            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "newUser",
                    password: "correcthorsebatterystaple",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The password must contain upper and lower case characters");
        });

        it("should allow a password that passes all requirements", async () => {
            await Promise.all([
                setSetting("password.requireNumber", true),
                setSetting("password.badCheck", true),
                setSetting("password.minLength", 10),
                setSetting("password.requireSpecial", true),
                setSetting("password.requireMixedCase", true),
            ]);

            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: "newUser",
                    password: "Correcth0rsebattery$taple",
                });

            expect(res.status).toBe(201);
        });

        it("should require an admin to create a user", async () => {
            await Promise.all([
                setSetting("password.requireNumber", true),
                setSetting("password.badCheck", true),
                setSetting("password.minLength", 10),
                setSetting("password.requireSpecial", true),
                setSetting("password.requireMixedCase", true),
            ]);

            const res = await request(app).post("/v1/users/")
                .send({
                    username: "newUser",
                    password: "Correcth0rsebattery$taple",
                });

            expect(res.status).toBe(401);
        });


    });

    describe("User validation", () => {
        it("should not allow a new user to have the same username as an existing user", async () => {
            const username = "sameusername";

            let res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: username,
                    password: "Correcth0rsebattery$taple",
                });

            expect(res.status).toBe(201);

            res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: username,
                    password: "Correcth0rsebattery$taple",
                });


            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe(`A User with the username ${username} already exists`);
        });

        it.each([
            "badusername@test.com",
            "username with spaces",
            "username%bad",
        ])("should not allow the invalid usernames %s", async (username: string) => {

            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: username,
                    password: "Correcth0rsebattery$taple",
                });


            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("Username's can only contain letters, numbers and '-', '.' or '_'");
        });

        it.each([
            "username",
            "user.name",
            "user_name",
            "user-name",
            ".username",
            "USERNAME",
            ".._..-..",
        ])("should allow the valid usernames %s", async (username: string) => {

            const res = await request(app).post("/v1/users/")
                .set("Authorization", `Bearer ${admin.token}`)
                .set("X-CSRFToken", admin.csrf)
                .send({
                    username: username,
                    password: "Correcth0rsebattery$taple",
                });

            expect(res.status).toBe(201);
        });

        describe("GET /v1/users/:username", () => {
            it("should not get an invalid user", async () => {
                const res = await request(app).get("/v1/users/badusername")
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf);
                expect(res.status).toBe(404);
            });

            it("should require a session", async () => {
                const res = await request(app).get(`/v1/users/${otherUser.username}`);
                expect(res.status).toBe(401);
            });

            it("should retrieve a user", async () => {
                const res = await request(app).get(`/v1/users/${otherUser.username}`)
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf);
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty("username");
                expect(res.body.username).toBe(otherUser.username);
                expect(res.body).not.toHaveProperty("password");
                expect(res.body).toHaveProperty("createdBy");
            });

            it("should retrieve self user if no ID is specified", async () => {
                const res = await request(app).get("/v1/users")
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf);
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty("username");
                expect(res.body.username).toBe(admin.username);
                expect(res.body).not.toHaveProperty("password");
            });
        });


        describe("PUT /v1/users/:username", () => {
            const tester = { username: "test.updates", password: "Correcth0rsebattery$taple" };
            beforeAll(async () => {
                await request(app).post("/v1/users/")
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf)
                    .send({
                        username: tester.username,
                        password: tester.password,
                    });
            });

            it("should require a session", async () => {
                const res = await request(app).put(`/v1/users/${tester.username}`)
                    .send({ version: 1 });
                expect(res.status).toBe(401);
            });

            it("should require the field version", async () => {
                const res = await request(app).put(`/v1/users/${tester.username}`)
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf);
                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty("message");
                expect(res.body.message).toBe("The field 'version' is required");
            });

            it("should not update if version is incorrect", async () => {
                const res = await request(app).put(`/v1/users/${tester.username}`)
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf)
                    .send({
                        version: 32,
                        endDate: new Date(),
                    });
                expect(res.status).toBe(409);
            });

            it.each(["startDate", "endDate"])("should update %s", async (field) => {
                let res = await request(app).get(`/v1/users/${tester.username}`)
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf);
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty("version");

                const version: number = res.body.version;
                const newDate = new Date();
                const body: Record<string, string | number | Date> = {
                    version,
                };
                body[field] = newDate;
                res = await request(app).put(`/v1/users/${tester.username}`)
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf)
                    .send(body);
                expect(res.status).toBe(200);

                res = await request(app).get(`/v1/users/${tester.username}`)
                    .set("Authorization", `Bearer ${admin.token}`)
                    .set("X-CSRFToken", admin.csrf);
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty("version");
                expect(res.body.version).toBe(version + 1);
                expect(res.body).toHaveProperty(field);
                expect(res.body[field]).toBe(newDate.toISOString());
            });
        });

    });

    describe("PUT /v1/password", () => {
        it("should require a the field password", async () => {
            const res = await request(app).put("/v1/password");
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The field 'password' is required");
        });

        it.each<[string, number]>([
            ["badpassword", 400],
            ["badpasswordthatislongenough", 400],
            ["P@ssw0rd", 400],
            ["qwerty123456789", 400],
            ["This1sAg00dP@ssw0rd", 200],
        ])("should validate the password %s with a status %d", async (password, expected) => {
            await Promise.all([
                setSetting("password.requireNumber", true),
                setSetting("password.badCheck", true),
                setSetting("password.minLength", 10),
                setSetting("password.requireSpecial", true),
                setSetting("password.requireMixedCase", true),
            ]);

            const res = await request(app).put("/v1/password")
                .send({
                    password,
                });

            expect(res.status).toBe(expected);
        });
    });
});

