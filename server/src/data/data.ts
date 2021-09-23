// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as sqlite from "sqlite3";
import crypto from "crypto";
import path from "path";
import * as fs from "fs";

import config from "../config";

const SYSTEMDBNAME = "system.db";

type changeResult = { lastID: number, changes: number };

export class Connection {
    private cnn?: sqlite.Database;

    constructor(public readonly filepath: string) {}

    public get inMemory(): boolean {
        return this.filepath.startsWith(":memory:");
    }

    public async open(): Promise<void> {
        if (!this.inMemory) {
            await new Promise<void>((resolve, reject) => {
                fs.mkdir(path.dirname(this.filepath), { recursive: true }, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }

        return new Promise((resolve, reject) => {
            this.cnn = new sqlite.Database(this.filepath, sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE,
                (err: Error | null) => {
                    if (err) {
                        this.cnn = undefined;
                        reject(err);
                        return;
                    }
                    this.setConnectionDefaults()
                        .then(resolve)
                        .catch(reject);
                });
        });
    }

    private async setConnectionDefaults(): Promise<void> {
        await this.query("PRAGMA foreign_keys = ON");
    }

    // query runs an unprepared query, all application queries should use prepared statements
    public async query<T>(sql: string, params?: T): Promise<T[]> {
        if (!this.cnn) {
            await this.open();
        }

        return new Promise<T[]>((resolve, reject) => {
            if (!this.cnn) { throw new Error("Connection is empty"); }
            this.cnn.all(sql, params, (err: Error, rows: T[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    private async prepStatement(sql: string): Promise<sqlite.Statement> {
        if (!this.cnn) {
            await this.open();
        }

        return new Promise<sqlite.Statement>((resolve, reject) => {
            if (!this.cnn) { throw new Error("Connection is empty"); }
            const statement = this.cnn.prepare(sql, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            resolve(statement);
        });
    }

    public prepareQuery<Params, Results>(sql: string): (params: Params) => Promise<Results[]> {
        let statement: sqlite.Statement;
        return async (params: Params): Promise<Results[]> => {
            if (!statement) {
                statement = await this.prepStatement(sql);
            }

            return new Promise<Results[]>((resolve, reject) => {
                statement.all(params, (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows as Results[]);
                });
            });
        };
    }

    public prepareUpdate<Params>(sql: string): (params: Params) => Promise<changeResult> {
        let statement: sqlite.Statement;
        return async (params: Params): Promise<changeResult> => {
            if (!statement) {
                statement = await this.prepStatement(sql);
            }

            return new Promise<changeResult>((resolve, reject) => {
                statement.run(params, function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ changes: this.changes, lastID: this.lastID });
                });
            });
        };
    }

    public async beginTran<T>(wrap: () => Promise<T>): Promise<T> {
        if (!this.cnn) {
            await this.open();
        }

        return new Promise<T>((resolve, reject) => {
            if (!this.cnn) { throw new Error("Connection is empty"); }
            this.cnn.serialize(() => {
                this.query("BEGIN")
                    .then(async () => {
                        const result = await wrap();
                        await this.query("COMMIT");
                        resolve(result);
                    }).catch(async (err) => {
                        await this.query("ROLLBACK");
                        reject(err);
                    });
            });
        });
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.cnn) {
                resolve(); // already closed
                return;
            }
            this.cnn.close((err: Error | null) => {
                if (err != null) {
                    reject(err);
                    return;
                }
                this.cnn = undefined;
                resolve();
            });
        });
    }
}

// random returns a URL safe string of random data of bits size
export function random(bits: number): string {
    return crypto.randomBytes(bits / 8).toString("base64").replace(/\+/g, "").replace(/\//g, "").replace(/=+$/, "");
}

export const sysdb = new Connection(config.dataDir.startsWith(":memory:") ? config.dataDir : path.join(config.dataDir, SYSTEMDBNAME));
