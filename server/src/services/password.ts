// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as fail from "../fail";
import settings from "../models/settings";

import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import fs from "fs";

interface IPasswordHash {
    hash(password: string): string;
    compare(password: string, hash: string): boolean;
}

const bcryptPlusSha512 = {
    BCRYPT_ROUNDS: 10,
    hash(password: string): string {
        return bcrypt.hashSync(crypto.createHash("sha512").update(password).digest("hex"), this.BCRYPT_ROUNDS);
    },
    compare(password: string, hash: string): boolean {
        return bcrypt.compareSync(crypto.createHash("sha512").update(password).digest("hex"), hash);
    },
};

const versions: IPasswordHash[] = [
    bcryptPlusSha512,
];

export const currentVersion = versions.length - 1;
export default versions[currentVersion];

// password version refers to index of default export
export { versions };

const BAD_PASSWORD_INDEX = fs.readFileSync("./src/services/bad_passwords.txt", "utf8");
/* eslint-disable quotes, no-useless-escape */
const SPECIAL_CHARACTERS = ` !"#$%&'()*+,-./:;<=>?@[\]^_` + "`{|}~";

export function validate(password: string): void {
    const min = settings.password.minLength.get();
    const bad = settings.password.badCheck.get();
    const special = settings.password.requireSpecial.get();
    const numbers = settings.password.requireNumber.get();
    const mixed = settings.password.requireMixedCase.get();

    if (password.length < min) {
        throw new fail.Failure(`Passwords must be at least ${min} characters long`);
    }

    if (bad) {
        if (BAD_PASSWORD_INDEX.indexOf(password) !== -1) {
            throw new fail.Failure("This password is too common and insecure, please choose another");
        }
    }

    let specialFound = false;
    let numberFound = false;
    let upperFound = false;
    let lowerFound = false;

    if (special || numbers || mixed) {
        for (const c of password) {
            let isNumber = false;
            if (numbers && !isNaN(parseInt(c, 10))) {
                numberFound = true;
                isNumber = true;
            }

            if (special) {
                for (const s of SPECIAL_CHARACTERS) {
                    if (s === c) {
                        specialFound = true;
                        break;
                    }
                }
            }

            if (!isNumber && mixed && (!upperFound || !lowerFound)) {
                if (c === c.toUpperCase()) {
                    upperFound = true;
                }

                if (c === c.toLowerCase()) {
                    lowerFound = true;
                }
            }
        }

        if (special && !specialFound) {
            throw new fail.Failure("The password must contain at least one special character");
        }
        if (numbers && !numberFound) {
            throw new fail.Failure("The password must contain at least one number");
        }
        if (mixed && (!upperFound || !lowerFound)) {
            throw new fail.Failure("The password must contain upper and lower case characters");
        }
    }
}

