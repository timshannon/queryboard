// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as fail from "../fail";
import { User } from "./user";
import { sysdb } from "../data/data";

export interface ISetting<T> {
    get(): T;
    set(user: User, value?: T): void;
}

// TODO: Cache these values

const sql = {
    insert: sysdb.prepareUpdate<{
        setting_id: string, value: string, updated_by: string, updated_date: Date,
    }>(`
        insert into settings (setting_id, value, updated_by, updated_date)
        values ($setting_id, $value, $updated_by, $updated_date)
    `),
    delete: sysdb.prepareUpdate<{
        setting_id: string,
    }>(`
        delete from settings where setting_id = $setting_id
    `),
    get: sysdb.prepareQuery<{
        setting_id: string,
    }, {
        value: string,
    }>("select value from settings where setting_id = $setting_id"),
};

export default {
    password: {
        minLength: numberSetting("password.minLength", 10, 8),
        // badCheck is whether or not to check new passwords against a list of known bad passwords
        badCheck: booleanSetting("password.badCheck", true),
        requireSpecial: booleanSetting("password.requireSpecial", false),
        requireNumber: booleanSetting("password.requireNumber", false),
        requireMixedCase: booleanSetting("password.requireMixedCase", false),
        // reuseCheck is how many versions back to check if a password is re-used, not including their current password
        reuseCheck: numberSetting("password.reuseCheck", 1, 0),
        expirationDays: numberSetting("password.expirationDays", 0, 0), // 0 means no expiration
    },
    session: {
        expirationDays: numberSetting("session.expirationDays", 90, 0, 365),
        // csrfAgeMinutes is how many minutes until a CSRF token is regenerated
        csrfAgeMinutes: numberSetting("session.csrfAgeMinutes", 15, 0),
    },
};

function setValue(user: User, id: string, value: { toString(): string }): void {
    if (!user.admin) {
        throw new fail.Unauthorized("Only admins can update settings");
    }

    sysdb.beginTran((): void => {
        sql.delete({ setting_id: id });
        sql.insert({
            setting_id: id,
            value: value.toString(),
            updated_by: user.username,
            updated_date: new Date(),
        });
    });
}

function getValue(id: string): string | null {
    const res = sql.get({ setting_id: id });

    if (res.length === 0) {
        return null;
    }

    return res[0].value;
}

function getBoolean(id: string, defaultValue: boolean): boolean {
    const strVal = getValue(id);
    if (strVal == null) {
        return defaultValue;
    }
    return strVal === "true";
}

function getNumber(id: string, defaultValue: number): number {
    const strVal = getValue(id);
    if (strVal == null) {
        return defaultValue;
    }
    return parseInt(strVal, 10) || defaultValue;
}

// async function getString(id: string, defaultValue: string): Promise<string> {
//     const strVal = await getValue(id);
//     if (strVal == null) {
//         return defaultValue;
//     }
//     return strVal;
// }

function booleanSetting(id: string, defaultValue: boolean): ISetting<boolean> {
    return {
        get: (): boolean => {
            return getBoolean(id, defaultValue);
        },
        set: (user: User, value = defaultValue): void => {
            return setValue(user, id, value);
        },
    };
}

function numberSetting(id: string, defaultValue: number, min?: number, max?: number): ISetting<number> {
    return {
        get: (): number => {
            return getNumber(id, defaultValue);
        },
        set: (user: User, value = defaultValue): void => {
            if (min !== undefined && value < min) {
                throw new fail.Failure(`${id} must be greater than ${min}`);
            }
            if (max !== undefined && value > max) {
                throw new fail.Failure(`${id} must be less than ${max}`);
            }
            return setValue(user, id, value.toString());
        },
    };
}

// function stringSetting(id: string, defaultValue: string, oneOf?: string[]): ISetting<string> {
//     return {
//         get: async (): Promise<string> => {
//             return getString(id, defaultValue);
//         },
//         set: async (user: User, value = defaultValue): Promise<void> => {
//             if (typeof value !== "string") {
//                 throw new fail.Failure(`Invalid setting type: ${value} is not a string`);
//             }
//             if (oneOf) {
//                 let found = false;
//                 for (const item of oneOf) {
//                     if (value === item) {
//                         found = true;
//                         break;
//                     }
//                 }
//                 if (!found) {
//                     throw new fail.Failure(`${id} must be one of ${oneOf}`);
//                 }
//             }
//             return await setValue(user, id, value);
//         },
//     };
// }

