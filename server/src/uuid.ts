// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as fail from "./fail";

import { v4 as uuid } from "uuid";

const matchUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ID = string & { __preventDuckTyping: never }; // ensures strict UUID type is used in functions

export function generate(): ID {
    return uuid() as ID;
}

// nilID is used to represent an empty UUID
// it's "valid" by default because sqlite allows nil UUIDs to be inserted into UUID columns,
// and the valid check's main purpose is to prevent bad user input from generating 500 errors
export const nilID = "00000000-0000-0000-0000-000000000000" as ID;

export function validate(id: string, allowNil = true): void {
    if (!isValid(id, allowNil)) {
        throw new fail.Failure(`The value ${id} is not a valid ID`);
    }
}

export function isValid(id: string, allowNil = true): boolean {
    return ((id === nilID && allowNil) || matchUUID.test(id));
}

