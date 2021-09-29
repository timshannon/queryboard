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
                setDefault("auth.password"),
            ]);
        });

        it.only("should require the password field", async () => {
            const res = await request(app).post("/v1/users/").
                send({
                    username: "blah",
                });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The field 'password' is required");
        });


        it("should require the username field", async () => {
            const res = await request(app).post("/v1/users/").
                send({
                    password: "newPassword!",
                });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The field 'username' is required");
        });

        it("should not allow a bad password", async () => {
            await setSetting("password.badCheck", true);

            const res = await request(app).post("/v1/users/").
                send({
                    username: "newUser",
                    password: "qwerty123456789",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("This password is too common and insecure, please choose another");
        });

        it("should enforce a minimum password length", async () => {
            await setSetting("password.minLength", 10);
            const res = await request(app).post("/v1/users/").
                send({
                    username: "newUser",
                    password: "$ffda#1",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("Passwords must be at least 10 characters long");
        });

        it("should require a special character", async () => {
            await setSetting("password.requireSpecial", true);
            const res = await request(app).post("/v1/users/").
                send({
                    username: "newUser",
                    password: "correcthorsebatterystaple",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The password must contain at least one special character");
        });

        it("should require a number", async () => {
            await setSetting("password.requireNumber", true);

            const res = await request(app).post("/v1/users/").
                send({
                    username: "newUser",
                    password: "correcthorsebatterystaple",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("message");
            expect(res.body.message).toBe("The password must contain at least one number");
        });

        it("should require mixed case", async () => {
            await setSetting("password.requireMixedCase", true);
            const res = await request(app).post("/v1/users/").
                send({
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

            const res = await request(app).post("/v1/users/").
                send({
                    username: "newUser",
                    password: "Correcth0rsebattery$taple",
                });

            expect(res.status).toBe(201);
        });

        //TODO: it should require an admin

    });

    //     describe("User validation", () => {
    //         it("should not allow a new user to have the same email address as an existing user", async () => {
    //             nock(config.common.services.portal).post("/v1/notifications").reply(201);
    //             const email = "same.email@test.com";
    //             const regID = await mockRegistration(email);
    //             const secondRegID = await mockRegistration(email);

    //             let res = await request(app).post(`/v1/users/password/${regID}`).
    //                 send({ password: "Correcth0rsebattery$taple" });

    //             expect(res.status).toBe(201);

    //             res = await request(app).post(`/v1/users/password/${secondRegID}`).
    //                 send({ password: "Correcth0rsebattery$taple" });

    //             expect(res.status).toBe(400);
    //             expect(res.body).toHaveProperty("message");
    //             expect(res.body.message).toBe(`A User with the email ${email} already exists`);
    //         });

    //         it.each([
    //             "badatbademail.com",
    //             "bad bademail.com",
    //             "bad.bademail.com",
    //             "@.com",
    //             "test @test.com",
    //         ])("should not allow the invalid email address %s", async (email: string) => {
    //             const regID = await mockRegistration(email);

    //             const res = await request(app).post(`/v1/users/password/${regID}`).
    //                 send({ password: "Correcth0rsebattery$taple" });

    //             expect(res.status).toBe(400);
    //             expect(res.body).toHaveProperty("message");
    //             expect(res.body.message).toBe("Invalid email address");
    //         });

    //         it("should send a notification when a registration is claimed", async () => {
    //             const fn = jest.fn();
    //             nock(config.common.services.portal).post("/v1/notifications").reply(201, () => {
    //                 fn();
    //             });
    //             await Promise.all([
    //                 setSetting("password.requireNumber", true),
    //                 setSetting("password.badCheck", true),
    //                 setSetting("password.minLength", 10),
    //                 setSetting("password.requireSpecial", true),
    //                 setSetting("password.requireMixedCase", true),
    //             ]);

    //             const regID = await mockRegistration("newpasswordpass@test.com");

    //             const res = await request(app).post(`/v1/users/password/${regID}`).
    //                 send({ password: "Correcth0rsebattery$taple" });

    //             expect(res.status).toBe(201);
    //             expect(fn).toHaveBeenCalled();
    //         });

    //     });
    // });

    // describe("GET /v1/users/:id", () => {
    //     it("should not get an invalid user", async () => {
    //         const res = await request(app).get(`/v1/users/${uuid.generate()}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(404);
    //     });

    //     it("should require a session", async () => {
    //         const res = await request(app).get(`/v1/users/${otherUser.id}`);
    //         expect(res.status).toBe(401);
    //     });

    //     it("should retrieve a user", async () => {
    //         const res = await request(app).get(`/v1/users/${otherUser.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("id");
    //         expect(res.body.id).toBe(otherUser.id);
    //         expect(res.body).toHaveProperty("email");
    //         expect(res.body.email).toBe(otherUser.email);
    //         expect(res.body).not.toHaveProperty("password");
    //         expect(res.body).toHaveProperty("createdBy");
    //     });

    //     it("should retrieve self user if no ID is specified", async () => {
    //         const res = await request(app).get(`/v1/users`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("id");
    //         expect(res.body.id).toBe(admin.id);
    //         expect(res.body).toHaveProperty("email");
    //         expect(res.body.email).toBe(admin.email);
    //         expect(res.body).not.toHaveProperty("password");
    //     });

    //     it("should retrieve a user by email address", async () => {
    //         const res = await request(app).get(`/v1/users?email=${otherUser.email}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("id");
    //         expect(res.body.id).toBe(otherUser.id);
    //         expect(res.body).toHaveProperty("email");
    //         expect(res.body.email).toBe(otherUser.email);
    //         expect(res.body).not.toHaveProperty("password");
    //     });

    //     it("should retrieve a search for a user by name", async () => {
    //         const res = await request(app).get(`/v1/users?search=${otherUser.fullName}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("data");
    //         expect(res.body.data).toHaveLength(1);
    //         expect(res.body.data[0]).toHaveProperty("id");
    //         expect(res.body.data[0].id).toBe(otherUser.id);
    //         expect(res.body.data[0]).toHaveProperty("email");
    //         expect(res.body.data[0].email).toBe(otherUser.email);
    //         expect(res.body.data[0]).not.toHaveProperty("password");
    //     });

    //     it("should retrieve a search for a user by email", async () => {
    //         const res = await request(app).get(`/v1/users?search=${otherUser.email}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("data");
    //         expect(res.body.data).toHaveLength(1);
    //         expect(res.body.data[0]).toHaveProperty("id");
    //         expect(res.body.data[0].id).toBe(otherUser.id);
    //         expect(res.body.data[0]).toHaveProperty("email");
    //         expect(res.body.data[0].email).toBe(otherUser.email);
    //         expect(res.body.data[0]).not.toHaveProperty("password");
    //     });

    //     it("should retrieve a search for a user by case insensitive partial name or email", async () => {
    //         const res = await request(app).get(`/v1/users?search=john`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("total");
    //         expect(res.body.total).toBe(2);
    //     });
    // });


    // describe("PUT /v1/users/:id", () => {
    //     const tester = { id: null, email: "test.updates@test.com", password: "Correcth0rsebattery$taple" };
    //     beforeAll(async () => {
    //         await bulk(undefined, undefined, [tester]);
    //     });

    //     it("should require a session", async () => {
    //         const res = await request(app).put(`/v1/users/${tester.id}`)
    //             .send({ version: 1 });
    //         expect(res.status).toBe(401);
    //     });

    //     it("should require the field version", async () => {
    //         const res = await request(app).put(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(400);
    //         expect(res.body).toHaveProperty("message");
    //         expect(res.body.message).toBe("The field 'version' is required");
    //     });

    //     it("should not allow a long name", async () => {
    //         const name = "long name long name long name long name long name long name long name long name long name long" +
    //             "name long name long name long name long name long name long name long name long name long name " +
    //             "name long name long name long name long name long name long name long name long name long name " +
    //             "name long name long name long name long name long name long name long name long name long name " +
    //             "name long name long name long name long name long name long name long name long name long name " +
    //             "name long name long name long name long name long name long name long name long name long name ";
    //         const body: any = {
    //             version: 0,
    //         };
    //         body.fullName = name;
    //         const res = await request(app).put(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf)
    //             .send(body);
    //         expect(res.status).toBe(400);
    //         expect(res.body).toHaveProperty("message");
    //         expect(res.body.message).toContain("is longer than 500 characters");
    //     });

    //     it("should not update if version is incorrect", async () => {
    //         const res = await request(app).put(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf)
    //             .send({
    //                 version: 32,
    //                 fullName: "New Name",
    //             });
    //         expect(res.status).toBe(409);
    //     });

    //     it("should update fullName", async () => {
    //         let res = await request(app).get(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("version");

    //         const version = res.body.version;
    //         const newName = "New Name";
    //         const body: any = {
    //             version,
    //         };
    //         body.fullName = newName;
    //         res = await request(app).put(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf)
    //             .send(body);
    //         expect(res.status).toBe(200);

    //         res = await request(app).get(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("version");
    //         expect(res.body.version).toBe(version + 1);
    //         expect(res.body).toHaveProperty("fullName");
    //         expect(res.body.fullName).toBe(newName);
    //     });

    //     it.each(["startDate", "endDate"])("should update %s", async (field) => {
    //         let res = await request(app).get(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("version");

    //         const version = res.body.version;
    //         const newDate = new Date();
    //         const body: any = {
    //             version,
    //         };
    //         body[field] = newDate;
    //         res = await request(app).put(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf)
    //             .send(body);
    //         expect(res.status).toBe(200);

    //         res = await request(app).get(`/v1/users/${tester.id}`)
    //             .set("Authorization", `Bearer ${admin.token}`)
    //             .set("X-CSRFToken", admin.csrf);
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("version");
    //         expect(res.body.version).toBe(version + 1);
    //         expect(res.body).toHaveProperty(field);
    //         expect(res.body[field]).toBe(newDate.toISOString());
    //     });

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

