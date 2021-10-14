// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as http from "../src/http";

import { Server, WebSocket } from "mock-socket";
import mock from "xhr-mock";

const testURL = "http://localhost";

describe("http Client", () => {
    beforeEach((done) => {
        mock.setup();
        localStorage.clear();
        sessionStorage.clear();

        mock.get(`${testURL}/v1/sessions`, {
            body: JSON.stringify({}),
            headers: {
                "x-csrftoken": "blah",
            },
            status: 201,
        });

        done();
    });

    afterEach(() => mock.teardown());

    it("should get a JSON response", async () => {
        const path = "/v1/test/";
        const response = {
            test: "value",
        };

        mock.get(testURL + path, {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
        });

        const client = new http.Client(testURL);

        const res = await client.get(path);
        expect(res.request).toBeInstanceOf(XMLHttpRequest);
        expect(res.response).toEqual(response);
    });

    it("should put a JSON value and get a JSON response", async () => {
        const path = "/v1/test/";
        const response = {
            test: "value",
        };

        mock.put(testURL + path, {
            headers: { "Content-Type": "application/json" },
            status: 200,
            body: JSON.stringify(response),
        });

        const client = new http.Client(testURL);

        const res = await client.put(path, { test: "value" });
        expect(res.request).toBeInstanceOf(XMLHttpRequest);
        expect(res.response).toEqual(response);
    });

    it("should post a JSON value and get a JSON response", async () => {
        const path = "/v1/test/";
        const response = {
            test: "value",
        };

        mock.post(testURL + path, {
            headers: { "Content-Type": "application/json" },
            status: 201,
            body: JSON.stringify(response),
        });

        const client = new http.Client(testURL);

        const res = await client.post(path, { test: "value" });
        expect(res.request).toBeInstanceOf(XMLHttpRequest);
        expect(res.response).toEqual(response);
    });

    it("should delete a JSON value and get a JSON response", async () => {
        const path = "/v1/test/";
        const response = {
            test: "value",
        };

        mock.delete(testURL + path, {
            headers: { "Content-Type": "application/json" },
            status: 201,
            body: JSON.stringify(response),
        });

        const client = new http.Client(testURL);

        const res = await client.delete(path, { test: "value" });
        expect(res.request).toBeInstanceOf(XMLHttpRequest);
        expect(res.response).toEqual(response);
    });

    it("should return an HttpError on 4XX statuses", async () => {
        const path = "/v1/test/";
        const response = {
            message: "An error has occurred",
        };

        mock.get(testURL + path, {
            headers: { "Content-Type": "application/json" },
            status: 400,
            body: JSON.stringify(response),
        });

        const client = new http.Client(testURL);
        try {
            await client.get(path);
        } catch (err) {
            expect(err).toBeInstanceOf(http.HttpError);
            if (err instanceof http.HttpError) {
                expect(err.request.status).toBe(400);
                expect(err.message).toBe(response.message);
            }
        }
    });

    it("should preserve and use csrf tokens", async () => {
        const path = "/v1/test/";
        const response = {
            test: "value",
        };

        const csrfToken = "abcdefg";

        mock.get(testURL + path, {
            status: 200,
            body: JSON.stringify(response),
            headers: {
                "X-CSRFToken": csrfToken,
                "Content-Type": "application/json",
            },
        });

        mock.post(testURL + path, (req, res) => {
            if (req.header("X-CSRFToken") !== csrfToken) {
                return res.status(409).body('{ message: "conflict" }');
            }
            return res.status(200);
        });

        const client = new http.Client(testURL);

        let result = await client.get(path);
        expect(result.request).toBeInstanceOf(XMLHttpRequest);
        expect(result.response).toEqual(response);

        result = await client.post(path);
        expect(result.request.status).toBe(200);
    });

    it("should include client headers", async () => {
        const path = "/v1/test/";
        const response = {
            test: "value",
        };
        const headerValue = "1234";

        mock.post(testURL + path, (req, res) => {
            res = res.header("Content-Type", "application/json");

            if (req.header("x-test-header") !== headerValue) {
                return res.status(400).body('{ message: "missing header" }');
            }
            return res.status(200).body(JSON.stringify(response));
        });

        const client = new http.Client(testURL, { "x-test-header": headerValue });

        const result = await client.post(path);
        expect(result.request).toBeInstanceOf(XMLHttpRequest);
        expect(result.response).toEqual(response);
        expect(result.request.status).toBe(200);
    });

    it("should preserve and use temporary sessions", async () => {
        const path = "/v1/test/";

        const sessionID = "abcdefg";

        mock.post(testURL + path, (req, res) => {
            if (req.header("Authorization") !== `Bearer ${sessionID}`) {
                return res.status(401).body('{ message: "not authorized" }');
            }
            return res.status(200);
        });

        const client = new http.Client(testURL);
        client.setSession(sessionID);

        const result = await client.post(path);
        expect(result.request.status).toBe(200);
    });

    it("should preserve and use sessions with expirations", async () => {
        const path = "/v1/test/";

        const sessionID = "abcdefg";
        const expires = new Date();
        expires.setDate(expires.getDate() + 1);

        mock.post(testURL + path, (req, res) => {
            if (req.header("Authorization") !== `Bearer ${sessionID}`) {
                return res.status(401).body('{ message: "not authorized" }');
            }
            return res.status(200);
        });

        const client = new http.Client(testURL);
        client.setSession(sessionID, expires);

        const result = await client.post(path);
        expect(result.request.status).toBe(200);
    });

    it("should preserve and use sessions from storage", async () => {
        const path = "/v1/test/";

        const sessionID = "abcdefg";
        const expires = new Date();
        expires.setDate(expires.getDate() + 1);

        mock.post(testURL + path, (req, res) => {
            if (req.header("Authorization") !== `Bearer ${sessionID}`) {
                return res.status(401).body('{ message: "not authorized" }');
            }
            return res.status(200);
        });

        const client = new http.Client(testURL);
        client.setSession(sessionID, expires);

        const otherClient = new http.Client(testURL); // should lookup session from storage
        const result = await otherClient.post(path);
        expect(result.request.status).toBe(200);
    });

    it("should not use sessions that have expired", async () => {
        const path = "/v1/test/";

        const sessionID = "abcdefg";
        const expires = new Date();
        expires.setDate(expires.getDate() - 1);

        mock.post(testURL + path, (req, res) => {
            if (req.header("Authorization") !== `Bearer ${sessionID}`) {
                return res.status(401).body('{ message: "not authorized" }');
            }
            return res.status(200);
        });

        const client = new http.Client(testURL);
        client.setSession(sessionID, expires);

        try {
            await client.post(path);
        } catch (err) {
            if (err instanceof http.HttpError) {
                expect(err.request.status).toBe(401);
            } else {
                throw err;
            }
        }

    });

    it("should test for sessions", (done) => {
        const sessionID = "abcdefg";
        const expires = new Date();
        expires.setDate(expires.getDate() + 100);

        const client = new http.Client(testURL);
        client.setSession(sessionID, expires);

        expect(http.hasSession()).toBe(true);

        done();
    });

    it("should not have a session if expired", (done) => {
        const sessionID = "abcdefg";
        const expires = new Date();
        expires.setDate(expires.getDate() - 100);

        const client = new http.Client(testURL);
        client.setSession(sessionID, expires);

        expect(http.hasSession()).toBe(false);

        done();
    });

    it("should build parameters for get requests", async () => {
        const path = "/v1/test";
        const fn = jest.fn();

        mock.get(testURL + path + "?limit=3&offset=0", (_, res) => {
            fn();
            return res.status(200);
        });

        const client = new http.Client(testURL);
        const limit = 3;
        const offset = 0;

        await client.get(path, { limit, offset });

        expect(fn).toHaveBeenCalled();
    });

    it("should call functions on status errors", async () => {
        const path = "/v1/test";
        const fn = jest.fn();

        mock.get(testURL + path, (_, res) => {
            return res.status(500);
        });

        const id = http.onError.add(() => {
            fn();
        });

        const client = new http.Client(testURL);

        try {
            await client.get(path);
        } catch (err) {
            // nothing to do
        }
        http.onError.remove(id);

        expect(fn).toHaveBeenCalled();
    });

    it("should call functions on parse errors", async () => {
        const path = "/v1/test";
        const fn = jest.fn();

        mock.get(testURL + path, {
            status: 200,
            body: "{:badjson",
        });

        const id = http.onError.add(() => {
            fn();
        });

        const client = new http.Client(testURL);

        try {
            await client.get(path);
        } catch (err) {
            // nothing to do
        }
        http.onError.remove(id);

        expect(fn).toHaveBeenCalled();
    });

    it("should not call functions on success", async () => {
        const path = "/v1/test";
        const fn = jest.fn();

        mock.get(testURL + path, {
            status: 200,
        });

        const id = http.onError.add(() => {
            fn();
        });

        const client = new http.Client(testURL);

        try {
            await client.get(path);
        } catch (err) {
            // nothing to do
        }
        http.onError.remove(id);

        expect(fn).not.toHaveBeenCalled();
    });

    it("should parse values that look like iso dates into date objects", async () => {
        const path = "/v1/test";
        const date = new Date();
        const payload = {
            dateField: date,
        };

        mock.get(testURL + path, {
            body: JSON.stringify(payload),
            status: 200,
        });

        const client = new http.Client(testURL);
        const res = await client.get<{ dateField: Date }>(path);
        expect(res.response).toHaveProperty("dateField");
        expect(res.response?.dateField).toEqual(date);
    });

    it("should handle non-json response errors", async () => {
        const path = "/v1/test/";
        const response = "Error message";

        mock.get(testURL + path, {
            status: 400,
            body: response,
            headers: { "Content-Type": "text/html" },
        });

        const client = new http.Client(testURL);

        try {
            await client.get(path);
        } catch (err) {
            if (err instanceof http.HttpError) {
                expect(err.message).toEqual(response);
            } else {
                throw err;
            }
        }
    });
});

describe("Socket", () => {
    const sessionID = "fasdfasdfsdf";
    const token = "123124sadfasdf";
    const url = "http://localhost";

    beforeEach((done) => {
        mock.setup();
        localStorage.clear();
        sessionStorage.clear();

        mock.get(url + "/v1/sessions", {
            body: JSON.stringify({}),
            headers: {
                "x-csrftoken": "blah",
                "Content-Type": "application/json"
            },
            status: 201,
        });

        mock.post(url + "/v1/sessions/token", {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            status: 201,
        });

        done();
    });

    afterEach(() => mock.teardown());

    it.each([
        ["http://localhost/", "/v1/test", "ws://localhost/v1/test"],
        ["https://localhost/", "/v1/test", "wss://localhost/v1/test"],
        ["https://localhost", "/v1/test", "wss://localhost/v1/test"],
        ["https://localhost", "v1/test", "wss://localhost/v1/test"],
    ])("should set the socket address for url %s and path %s to %s", (url, path, result) => {
        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path);
        expect(socket.socketAddress()).toBe(result);
    });

    it("should connect to a websocket", async () => {
        const path = "/v1/test";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path);
        const server = new Server(socket.socketAddress());

        const fn = jest.fn();
        server.on("connection", fn);

        try {
            await socket.connect();
            expect(fn).toBeCalled();
        } finally {
            server.stop();
        }
    });

    it("should connect to a websocket without a session", async () => {
        const path = "/v1/test";

        const client = new http.Client(url);

        const socket = client.socket(path);
        const server = new Server(socket.socketAddress());

        const fn = jest.fn();
        server.on("connection", fn);

        await socket.connect();
        expect(fn).toBeCalled();
        server.stop();
    });

    it("should reconnect on socket errors", (done) => {
        const path = "/v1/test";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());
        const fn = jest.fn();

        server.on("connection", () => {
            fn();
        });

        void socket.connect()
            .then(() => {
                socket.connection?.dispatchEvent(new Event("error"));
                setTimeout(() => {
                    expect(fn).toBeCalledTimes(2);
                    server.stop();
                    done();
                }, 1100);
            });
    });

    it("should reconnect when socket closes", (done) => {
        const path = "/v1/test";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());
        const fn = jest.fn();

        server.on("connection", (ws) => {
            fn();
            ws.close();
        });

        void socket.connect()
            .then(() => {
                setTimeout(() => {
                    expect(fn).toBeCalledTimes(2);
                    server.stop();
                    done();
                }, 1100);
            });
    });

    it("should receive messages", (done) => {
        const path = "/v1/test";
        const msg = "test message";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());
        let ws: WebSocket | undefined;

        server.on("connection", (s) => {
            ws = s;
        });

        socket.onmessage = (event) => {
            expect(event.data).toBe(msg);
            server.stop();
            done();
        };

        void socket.connect()
            .then(() => {
                ws?.send(msg);
            });
    });

    it("should send messages", (done) => {
        const path = "/v1/test";
        const msg = "test message";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());

        server.on("connection", (ws: WebSocket) => {
            ws.on("message", (data: unknown) => {
                expect(data).toBe(msg);
                server.stop();
                done();
            });
        });

        void socket.connect()
            .then(async () => {
                await socket.send(msg);
            });
    });

    it("should send object", (done) => {
        const path = "/v1/test";
        const msgObject = {
            test: "test message",
            other: 1234,
        };

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());

        server.on("connection", (ws: WebSocket) => {
            ws.on("message", (data: unknown) => {
                expect(data).toBe(JSON.stringify(msgObject));
                server.stop();
                done();
            });
        });

        void socket.connect()
            .then(async () => {
                await socket.send(msgObject);
            });
    });

    it("should auto connect when sending messages", (done) => {
        const path = "/v1/test";
        const msg = "test message";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());

        server.on("connection", (ws: WebSocket) => {
            ws.on("message", (data: unknown) => {
                expect(data).toBe(msg);
                server.stop();
                done();
            });
        });

        void socket.send(msg);
    });

    it("should not auto retry when manually closed", async () => {
        const path = "/v1/test";

        const client = new http.Client(url);
        client.setSession(sessionID);

        const socket = client.socket(path, 1000);
        const server = new Server(socket.socketAddress());
        const fn = jest.fn();

        server.on("connection", (_) => {
            fn();
        });

        await socket.connect();
        const p = new Promise<void>((resolve) => {
            socket.close();
            setTimeout(() => {
                expect(fn).toBeCalledTimes(2);
                server.stop();
                resolve();
            }, 1100);
        });
        await p;
    });
});
