// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as fail from "../fail";
import { User } from "./user";
import { sysdb } from "../data/data";

interface ISetting<T> {
    get(): Promise<T>;
    set(user: User, value?: T): Promise<void>;
}

// TODO: Cache these values

const sql = {
    insert: sysdb.prepare<{
        $setting_id: string, $value: string, $updated_by: string, $updated_date: Date,
    }, void>(`
        insert into settings (setting_id, value, updated_by, updated_date)
        values ($setting_id, $value, $updated_by, $updated_date)
    `),
    delete: sysdb.prepare<{
        $setting_id: string,
    }, void>(`
        delete from settings where setting_id = $setting_id
    `),
    get: sysdb.prepare<{
        $setting_id: string,
    }, {
        value: string,
    }>(`select value from settings where setting_id = $setting_id`),
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

async function setValue(user: User, id: string, value: any): Promise<void> {
    if (!user.admin) {
        throw new fail.Unauthorized("Only admins can update settings");
    }

    await sysdb.beginTran(async (): Promise<void> => {
        await sql.delete({ $setting_id: id });
        await sql.insert({
            $setting_id: id,
            $value: value.toString(),
            $updated_by: user.username,
            $updated_date: new Date(),
        });
    });
}

async function getValue(id: string): Promise<string | null> {
    const res = await sql.get({ $setting_id: id });

    if (res.length === 0) {
        return null;
    }

    return res[0].value;
}

async function getBoolean(id: string, defaultValue: boolean): Promise<boolean> {
    const strVal = await getValue(id);
    if (strVal == null) {
        return defaultValue;
    }
    return strVal === "true";
}

async function getNumber(id: string, defaultValue: number): Promise<number> {
    const strVal = await getValue(id);
    if (strVal == null) {
        return defaultValue;
    }
    return parseInt(strVal!, 10) || defaultValue;
}

async function getString(id: string, defaultValue: string): Promise<string> {
    const strVal = await getValue(id);
    if (strVal == null) {
        return defaultValue;
    }
    return strVal;
}

function booleanSetting(id: string, defaultValue: boolean): ISetting<boolean> {
    return {
        get: async (): Promise<boolean> => {
            return getBoolean(id, defaultValue);
        },
        set: async (user: User, value = defaultValue): Promise<void> => {
            if (typeof value !== "boolean") {
                throw new fail.Failure(`Invalid setting type: ${value} is not a boolean`);
            }
            return await setValue(user, id, value.toString());
        },
    };
}

function numberSetting(id: string, defaultValue: number, min?: number, max?: number): ISetting<number> {
    return {
        get: async (): Promise<number> => {
            return getNumber(id, defaultValue);
        },
        set: async (user: User, value = defaultValue): Promise<void> => {
            if (typeof value !== "number") {
                throw new fail.Failure(`Invalid setting type: ${value} is not a number`);
            }
            if (min !== undefined && value < min) {
                throw new fail.Failure(`${id} must be greater than ${min}`);
            }
            if (max !== undefined && value > max) {
                throw new fail.Failure(`${id} must be less than ${max}`);
            }
            return await setValue(user, id, value.toString());
        },
    };
}

function stringSetting(id: string, defaultValue: string, oneOf?: string[]): ISetting<string> {
    return {
        get: async (): Promise<string> => {
            return getString(id, defaultValue);
        },
        set: async (user: User, value = defaultValue): Promise<void> => {
            if (typeof value !== "string") {
                throw new fail.Failure(`Invalid setting type: ${value} is not a string`);
            }
            if (oneOf) {
                let found = false;
                for (const item of oneOf) {
                    if (value === item) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    throw new fail.Failure(`${id} must be one of ${oneOf}`);
                }
            }
            return await setValue(user, id, value);
        },
    };
}

