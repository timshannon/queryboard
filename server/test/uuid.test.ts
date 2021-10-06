// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as fail from "../src/fail";
import * as uuid from "../src/uuid";

describe("IDs", () => {
    it("should generate a new ID", () => {
        const id = uuid.generate();
        uuid.validate(id);
        expect(id).not.toBe(uuid.nilID);
    });

    it.each([
        "",
        " ",
        "0",
        "00000000-0000-0000-0000-000000000001",
        "10000000-0000-0000-0000-000000000000",
        "11111111-1111-1111-1111-111111111111",
    ])("should not validate invalid ids", (id: string) => {
        expect(uuid.isValid(id)).toBe(false);
    });

    it.each([
        uuid.generate(),
        uuid.generate(),
        uuid.generate(),
        uuid.generate(),
        uuid.generate(),
        uuid.generate(),
        "00000000-0000-0000-0000-000000000000",
        "7077ec7f-8364-44db-9d89-1af0a5be7611",
        "9b459865-63fa-4bdd-be4a-6e2e162cb712",
        "0adbe34e-7ad2-49a5-9c1c-6f92f857ab2d",
    ])("should validate valid ids", (id: string) => {
        expect(uuid.isValid(id)).toBe(true);
    });

    it("should optionally not validate nil id", () => {
        expect(uuid.isValid(uuid.nilID, false)).toBe(false);
    });

    it("should throw a failure on invalid ids", () => {
        try {
            uuid.validate("bad-uuid");
        } catch (err) {
            expect(err).toBeInstanceOf(fail.Failure);
        }
    });
});

