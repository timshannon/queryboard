// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import config from "../config";
import { ensureSchema, Schema } from "./schema_control";
import schema from "./schema";

import sqlite from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import * as fs from "fs";


const SYSTEMDBNAME = "system.db";

type changeResult = { lastID: number | BigInt, changes: number };

type SQLiteType = number | string | bigint | Buffer | null;

type SQLiteRecord = {
    [key: string]: SQLiteType;
};

// addss support for boolean and Date
type QBSQLType = number | string | bigint | Buffer | null | boolean | Date;

type QBSQLRecord = {
    [key: string]: QBSQLType;
};

export class Connection {
    public readonly cnn: sqlite.Database;

    constructor(public readonly filepath: string, public readonly options?: sqlite.Options, schema?: Schema) {
        if (!filepath.startsWith(":memory:")) {
            fs.mkdirSync(path.dirname(this.filepath), { recursive: true });
        }

        this.cnn = new sqlite(this.filepath, this.options);
        this.cnn.pragma("journal_mode = WAL");
        this.cnn.pragma("foreign_keys = ON");

        if (schema) {
            ensureSchema(this, schema);
        }
    }

    private prepParameters(params: QBSQLRecord): SQLiteRecord {
        const res: SQLiteRecord = {};

        for (const key in params) {
            if (typeof params[key] == "boolean") {
                res[key] = params[key] ? 1 : 0;
            } else if (params[key] instanceof Date) {
                res[key] = (params[key] as Date).toISOString();
            } else {
                res[key] = params[key] as number | string | bigint | Buffer | null;
            }
        }

        return res;
    }

    private prepRecord(columns: sqlite.ColumnDefinition[], record: SQLiteType[]): QBSQLRecord {
        const res: QBSQLRecord = {};

        for (let i = 0; i < columns.length; i++) {
            if (record[i] == undefined || record[i] == null) {
                res[columns[i].name] = null;
            } else if (columns[i].type == "DATETIME") {
                if (typeof record[i] == "string") {
                    res[columns[i].name] = new Date(record[i] as string);
                } else {
                    throw new Error(`Unknown DATETIME value format for column ${columns[i].name}: ${record[i]}`);
                }
            } else if (columns[i].type == "BOOLEAN") {
                res[columns[i].name] = record[i] ? true : false;
            } else {
                res[columns[i].name] = record[i];
            }
        }

        return res;
    }

    private prepResult(columns: sqlite.ColumnDefinition[], results: SQLiteType[][]): QBSQLRecord[] {
        const res: QBSQLRecord[] = [];

        for (const record of results) {
            res.push(this.prepRecord(columns, record));
        }
        return res;
    }

    // query runs an adhoc query, all application queries should use prepared statements
    public query<Results extends QBSQLRecord>(sql: string, params?: QBSQLRecord): Results[] {
        try {
            const stmt = this.cnn.prepare(sql);
            if (stmt.reader) {
                let res;
                stmt.raw(true);
                if (params) {
                    res = stmt.all(this.prepParameters(params));
                } else {
                    res = stmt.all();
                }

                return this.prepResult(stmt.columns(), res as SQLiteType[][]) as Results[];
            }

            if (params) {
                stmt.run(this.prepParameters(params));
            } else {
                stmt.run();
            }
            return [] as Results[];

        } catch (err) { throw new Error(`${err}\n QUERY: ${sql}`); }
    }

    public prepareQuery<Params extends QBSQLRecord | void, Results extends QBSQLRecord>
        (sql: string): (params: Params | void) => Results[] {
        try {
            const statement = this.cnn.prepare(sql);
            statement.raw(true);

            return (params: Params | void): Results[] => {
                try {
                    const res = statement.all(this.prepParameters(params || {}));
                    return this.prepResult(statement.columns(), res as SQLiteType[][]) as Results[];
                } catch (err) { throw new Error(`${err}\n QUERY: ${sql}`); }
            };
        } catch (err) { throw new Error(`${err}\n QUERY: ${sql}`); }
    }

    public prepareUpdate<Params extends QBSQLRecord>(sql: string): (params: Params) => changeResult {
        try {
            const statement = this.cnn.prepare(sql);
            return (params: Params): changeResult => {
                try {
                    const res = statement.run(this.prepParameters(params));
                    return { changes: res.changes, lastID: res.lastInsertRowid };
                } catch (err) { throw new Error(`${err}\n QUERY: ${sql}`); }
            };
        } catch (err) { throw new Error(`${err}\n QUERY: ${sql}`); }
    }

    public beginTran<T>(wrap: () => T): T {
        return this.cnn.transaction(wrap)();
    }

    public close(): void {
        this.cnn.close();
    }
}

// random returns a URL safe string of random data of bits size
export function random(bits: number): string {
    return crypto.randomBytes(bits / 8).toString("base64").replace(/\+/g, "").replace(/\//g, "").replace(/=+$/, "");
}

export const sysdb = new Connection(
    config.dataDir.startsWith(":memory:") ? config.dataDir : path.join(config.dataDir, SYSTEMDBNAME),
    undefined,
    schema.system
);
