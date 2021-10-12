// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import express, { Express } from "express";
import request from "supertest";
import { json } from "body-parser";

import * as fail from "../src/fail";
import * as middleware from "../src/middleware";
import * as routes from "../src/route_validation";
import * as uuid from "../src/uuid";

const { route, query, param, body, files } = routes;

let app: Express;

describe("validations", () => {
    beforeEach(() => {
        app = express();
        app.use(json());
    });

    it.each([
        [{ email: "" }, body("email").exists(), true],
        [{ email: "" }, body("email").isRequired(), false],
        [{ email: "" }, body("other").exists(), false],
        [{}, body("email").isRequired(), false],
        [{ test: false }, body("test").isRequired(), true],
        [{ test: "   " }, body("test").isRequired(), false],
        [{ test: uuid.generate() }, body("test").isUUID(), true],
        [{ test: "1224234-234234" }, body("test").isUUID(), false],
        [{ test: "1-1-2018" }, body("test").isDate(), true],
        [{ test: "1-37-2018" }, body("test").isDate(), false],
        [{ test: "blah" }, body("test").isDate(), false],
        [{ test: "31-dec-9999" }, body("test").isDate(), true],
        [{ test: "test", num: 1234 }, body("num").isInt(), true],
        [{ test: "test", num: "" }, body("num").isInt(), true],
        [{ url: "blah" }, body("url").isRequired().isURL(), false],
        [{ url: "http://blah" }, body("url").isRequired().isURL(), true],
        [{ url: "http://blah.com" }, body("url").isRequired().isURL(), true],
        [{ num: "asdf" }, body("num").isInt(), false],
        [{ num: "asdf" }, body("num").isFloat(), false],
        [{ num: 1234.3 }, body("num").isInt(), true],
        [{ num: "c1234.32" }, body("num").isFloat(), false],
        [{ test: "test", num: "test" }, body("num").isInt(), false],
        [{ test: "test", num: "test" }, body("test").isOneOf("foo", "bar", "baz"), false],
        [{ test: "test", num: "test" }, body("test").isOneOf("foo", "bar", "baz", "test"), true],
    ])("should validate body fields: %p:%p:%p", async (data, validation, valid) => {
        const path = "/test";

        route(app, false).post(path, (_: express.Request, res: express.Response) => {
            res.send();
        }, validation);

        const result = await request(app).post(path)
            .send(data);
        if (valid) {
            expect(result.status).toBe(200);
        } else {
            expect(result.status).toBe(400);
        }
    });
    it.each<[string, boolean]>([
        ["https://google.com", true],
        ["/path/only", false],
        ["noprotocol.com", false],
        ["http://", false],
    ])("should validate urls: test %# value: '%p'", async (data, valid) => {
        const path = "/test";

        route(app, false).post(path, (_: express.Request, res: express.Response) => {
            res.send();
        }, body("data").isURL());

        const result = await request(app).post(path)
            .send({ data });
        if (valid) {
            expect(result.status).toBe(200);
        } else {
            expect(result.status).toBe(400);
        }
    });

    it.each([
        [body("url").isURL(), { url: "https://google.com" }, { url: "https://google.com/" }],
        [body("num").isInt(), { num: "33.3" }, { num: 33 }],
        [body("num").isInt(), { num: "" }, { num: null }],
        [body("num").isInt(), { num: null }, { num: null }],
        [body("num").isFloat(), { num: "33.3testgarbage" }, { num: 33.3 }],
        [body("num").isFloat(), { num: "" }, { num: null }],
        [body("num").isFloat(), { num: null }, { num: null }],
        [body("bool").isBoolean(), {}, { bool: undefined }],
        [body("bool").isBoolean(), { bool: null }, { bool: false }],
        [body("bool").isBoolean(), { bool: "" }, { bool: false }],
        [body("bool").isBoolean(), { bool: "false" }, { bool: false }],
        [body("bool").isBoolean(), { bool: "FALSE" }, { bool: false }],
        [body("bool").isBoolean(), { bool: "no" }, { bool: false }],
        [body("bool").isBoolean(), { bool: "NO" }, { bool: false }],
        [body("bool").isBoolean(), { bool: 0 }, { bool: false }],
        [body("bool").isBoolean(), { bool: 1 }, { bool: true }],
        [body("bool").isBoolean(), { bool: "true" }, { bool: true }],
        [body("bool").isBoolean(), { bool: "TRUE" }, { bool: true }],
        [body("bool").isBoolean(), { bool: "yes" }, { bool: true }],
        [body("bool").isBoolean(), { bool: "YES" }, { bool: true }],
        [body("bool").isBoolean(), { bool: undefined }, { bool: undefined }],
    ])("should return a corrected type value for body fields: test %# value: '%p'", async (test, data, corrected) => {
        const path = "/test";

        let updated = {};

        route(app, false).post(path, (req: express.Request, res: express.Response) => {
            updated = req.body;
            res.send();
        }, test);

        await request(app).post(path)
            .send(data);
        expect(updated).toEqual(corrected);
    });

    it.each([
        [query("bool").isBoolean(), "?bool=false", { bool: false }],
        [query("bool").isBoolean(), "?bool=no", { bool: false }],
        [query("bool").isBoolean(), "?other=blah", { other: "blah", bool: undefined }],
        [query("bool").isBoolean(), "?other=blah&bool", { other: "blah", bool: true }],
        [query("num").isInt(), "?other=blah&num=3.0", { other: "blah", num: 3 }],
    ])("should return a corrected type value for query fields: test %# value: '%p'", async (test, qry, corrected) => {
        const path = "/test";

        let updated = {};

        route(app, false).get(path, (req: express.Request, res: express.Response) => {
            updated = req.query;
            res.send();
        }, test);

        await request(app).get(path + qry);
        expect(updated).toEqual(corrected);
    });

    it.each([
        [param("value").isBoolean(), "false", { value: false }],
        [param("value").isBoolean(), "no", { value: false }],
        [param("value").isBoolean(), "yes", { value: true }],
        [param("value").isBoolean(), "true", { value: true }],
        [param("value").isInt(), "3.0", { value: 3 }],
    ])("should return a corrected type value for param fields: test %# value: '%p'", async (test, prm, corrected) => {
        let updated = {};

        route(app, false).get("/test/:value", (req: express.Request, res: express.Response) => {
            updated = req.params;
            res.send();
        }, test);

        await request(app).get(`/test/${prm}`);
        expect(updated).toEqual(corrected);
    });

    it("should validate multiple fields and types in a put route", async () => {
        let rq: express.Request | undefined;

        route(app, false).put("/v1/model/:id", (req: express.Request, res: express.Response) => {
            rq = req;
            res.send();
        },
            param("id").isRequired().isUUID().description("unique identifier for the given model"),
            query("limit").isInt().description("limits the number of records returned"),
            query("offset").isInt().description("offset from the beginning of the list of records"),
            body("userID").isRequired().isUUID().description("id of the user for the model"),
            body("subject").isRequired().isString().description("subject of the model"),
            body("body").isRequired().isString().description("body of the model"),
            body("applicationID").isRequired().isUUID().description("ID of the application for the model"),
        );

        const id = uuid.generate();
        const limit = 10;
        const offset = 100;
        const userID = uuid.generate();
        const subject = "test subject";
        const bdy = "test body";
        const applicationID = uuid.generate();

        await request(app).put(`/v1/model/${id}?limit=${limit}&offset=${offset}`)
            .send({
                userID,
                subject,
                body: bdy,
                applicationID,
            });

        expect(rq?.body).toHaveProperty("userID");
        expect(rq?.body.userID).toBe(userID);
        expect(rq?.body).toHaveProperty("subject");
        expect(rq?.body.subject).toBe(subject);
        expect(rq?.body).toHaveProperty("body");
        expect(rq?.body.body).toBe(bdy);
        expect(rq?.body).toHaveProperty("applicationID");
        expect(rq?.body.applicationID).toBe(applicationID);
        expect(rq?.params).toHaveProperty("id");
        expect(rq?.params.id).toBe(id);
        expect(rq?.query).toHaveProperty("limit");
        expect(rq?.query.limit).toBe(limit);
        expect(rq?.query).toHaveProperty("offset");
        expect(rq?.query.offset).toBe(offset);
    });

    it("should validate multiple fields and types in a delete route", async () => {
        let rq: express.Request | undefined;

        route(app, false).delete("/v1/model/:id", (req: express.Request, res: express.Response) => {
            rq = req;
            res.send();
        },
            param("id").isRequired().isUUID().description("unique identifier for the given model"),
            query("limit").isInt().description("limits the number of records returned"),
            query("offset").isInt().description("offset from the beginning of the list of records"),
            body("userID").isRequired().isUUID().description("id of the user for the model"),
            body("subject").isRequired().isString().description("subject of the model"),
            body("body").isRequired().isString().description("body of the model"),
            body("applicationID").isRequired().isUUID().description("ID of the application for the model"),
        );

        const id = uuid.generate();
        const limit = 10;
        const offset = 100;
        const userID = uuid.generate();
        const subject = "test subject";
        const bdy = "test body";
        const applicationID = uuid.generate();

        await request(app).delete(`/v1/model/${id}?limit=${limit}&offset=${offset}`)
            .send({
                userID,
                subject,
                body: bdy,
                applicationID,
            });

        expect(rq?.body).toHaveProperty("userID");
        expect(rq?.body.userID).toBe(userID);
        expect(rq?.body).toHaveProperty("subject");
        expect(rq?.body.subject).toBe(subject);
        expect(rq?.body).toHaveProperty("body");
        expect(rq?.body.body).toBe(bdy);
        expect(rq?.body).toHaveProperty("applicationID");
        expect(rq?.body.applicationID).toBe(applicationID);
        expect(rq?.params).toHaveProperty("id");
        expect(rq?.params.id).toBe(id);
        expect(rq?.query).toHaveProperty("limit");
        expect(rq?.query.limit).toBe(limit);
        expect(rq?.query).toHaveProperty("offset");
        expect(rq?.query.offset).toBe(offset);
    });

    it("should capture throw errors and pass them to error handler", async () => {

        route(app, false).delete("/v1/model/", () => {
            throw new fail.Failure("blah");
        });

        const result = await request(app).delete("/v1/model/");
        expect(result.status).toBe(400);
    });

    it("should require a session", async () => {
        route(app).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        });

        const result = await request(app).post("/v1/model/");
        expect(result.status).toBe(401);
    });

    it("should validate contentType for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files().isContentType("image/jpeg", "text/plain"));

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/")
            .attach("test.png", "./test/test.png");

        expect(result.status).toBe(400);
        expect(result.body).toHaveProperty("message");
        expect(result.body.message).toContain("Content-Type is not one of the following");
    });

    it("should allow files of the valid contentType for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.status(201).send();
        }, files().isContentType("image/png", "text/plain"));

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/")
            .attach("test.png", "./test/test.png");

        expect(result.status).toBe(201);
    });

    it("should not allow files unless they match a regex for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files().nameMatches(/test1234/));

        app.use(middleware.errors);

        const fileName = "test.png";
        const result = await request(app).post("/v1/model/")
            .attach(fileName, "./test/test.png");

        expect(result.status).toBe(400);
        expect(result.body).toHaveProperty("message");
        expect(result.body.message).toContain(`The file name ${fileName} is invalid`);
    });

    it("should limit the number of files for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files().maxFiles(1));

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/")
            .attach("test1.png", "./test/test.png")
            .attach("test2.png", "./test/test.png");

        expect(result.status).toBe(400);
        expect(result.body).toHaveProperty("message");
        expect(result.body.message).toContain("Only one file upload is allowed");
    });

    it("should require a file for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files().required());

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/");

        expect(result.status).toBe(400);
        expect(result.body).toHaveProperty("message");
        expect(result.body.message).toContain("You must upload at least one file");
    });

    it("should require a minimum number of files for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files().minFiles(3));

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/")
            .attach("test1.png", "./test/test.png")
            .attach("test2.png", "./test/test.png");

        expect(result.status).toBe(400);
        expect(result.body).toHaveProperty("message");
        expect(result.body.message).toContain("At least 3 files need to be uploaded");
    });

    it("should limit the size of files for file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files().sizeLimitKB(1));

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/")
            .attach("test1.png", "./test/test.png");

        expect(result.status).toBe(413);
        expect(result.body).toHaveProperty("message");
        expect(result.body.message).toContain("Upload max size reached");
    });

    it("should allow optional file uploads", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files());

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/");

        expect(result.status).toBe(200);
    });

    it("should return a 400 if non-mulitpart contentType is set", async () => {
        route(app, false).post("/v1/model/", (_: express.Request, res: express.Response) => {
            res.send();
        }, files());

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/").send({ test: "test" });

        expect(result.status).toBe(400);
    });

    it("should upload files", async () => {
        const fn = jest.fn();
        route(app, false).post("/v1/model/", (req: express.Request, res: express.Response) => {
            if (req.files) {
                fn(req.files[0].filename);
            }
            res.status(201).send();
        }, files().sizeLimitKB(10));

        app.use(middleware.errors);

        const result = await request(app).post("/v1/model/")
            .attach("test.png", "./test/test.png");

        expect(result.status).toBe(201);
        expect(fn).toHaveBeenCalledWith("test.png");
    });
});

