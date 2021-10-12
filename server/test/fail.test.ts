// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import * as fail from "../src/fail";

describe("failures", () => {
    it("should behave like an Error", () => {
        const msg = "Failure message";
        try {
            throw new fail.Failure(msg);
        } catch (err) {
            expect(err).toBeInstanceOf(fail.Failure);
            if (err instanceof fail.Failure) {
                expect(err).toHaveProperty("stack");
                expect(err).toHaveProperty("message");
                expect(err.message).toBe(msg);
                expect(err).toBeInstanceOf(fail.Failure);
                expect(err).toHaveProperty("status");
                expect(err.status).toBe(400);
            }
        }
    });

    it("should have default messages for Not Found", () => {
        try {
            throw new fail.NotFound();
        } catch (err) {
            expect(err).toBeInstanceOf(fail.Failure);
            if (err instanceof fail.Failure) {
                expect(err).toHaveProperty("stack");
                expect(err).toHaveProperty("message");
                expect(err.message).toBe("Not Found");
                expect(err).toBeInstanceOf(fail.Failure);
                expect(err).toHaveProperty("status");
                expect(err.status).toBe(404);
            }
        }
    });

    it("should have default messages for Unauthorized", () => {
        try {
            throw new fail.Unauthorized();
        } catch (err) {
            expect(err).toBeInstanceOf(fail.Failure);
            if (err instanceof fail.Failure) {
                expect(err).toHaveProperty("stack");
                expect(err).toHaveProperty("message");
                expect(err.message).toBe("Unauthorized");
                expect(err).toBeInstanceOf(fail.Failure);
                expect(err).toHaveProperty("status");
                expect(err.status).toBe(401);
            }
        }
    });

    it("should have default messages for Conflicts", () => {
        try {
            throw new fail.Conflict();
        } catch (err) {
            expect(err).toBeInstanceOf(fail.Failure);
            if (err instanceof fail.Failure) {
                expect(err).toHaveProperty("stack");
                expect(err).toHaveProperty("message");
                expect(err.message).toBe("You are not updating the most recent version of the record");
                expect(err).toBeInstanceOf(fail.Failure);
                expect(err).toHaveProperty("status");
                expect(err.status).toBe(409);
            }
        }
    });
});

