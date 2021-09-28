// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import sqlite from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import * as fs from "fs";

import config from "../config";

const SYSTEMDBNAME = "system.db";

type changeResult = { lastID: number | BigInt, changes: number };

export class Connection {
    public readonly cnn: sqlite.Database;

    constructor(public readonly filepath: string, public readonly options?: sqlite.Options) {
        if (!this.inMemory) {
            fs.mkdirSync(path.dirname(this.filepath), { recursive: true });
        }

        this.cnn = new sqlite(this.filepath, this.options);
        this.cnn.pragma("journal_mode = WAL");
        this.cnn.pragma("PRAGMA foreign_keys = ON");
    }

    public get inMemory(): boolean {
        return this.cnn.memory;
    }

    // query runs an adhoc query, all application queries should use prepared statements
    public query<T>(sql: string, params?: unknown): T[] {
        const stmt = this.cnn.prepare(sql);
        const res = stmt.all(params as T);
        return res as T[];
    }

    public prepareQuery<Params, Results>(sql: string): (params: Params) => Results[] {
        const statement = this.cnn.prepare(sql);

        return (params: Params): Results[] => {
            return statement.all(params) as Results[];
        };
    }

    public prepareUpdate<Params>(sql: string): (params: Params) => changeResult {
        const statement = this.cnn.prepare(sql);
        return (params: Params): changeResult => {
            const res = statement.run(params);
            return { changes: res.changes, lastID: res.lastInsertRowid };
        };
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

export const sysdb = new Connection(config.dataDir.startsWith(":memory:") ? config.dataDir : path.join(config.dataDir, SYSTEMDBNAME));
