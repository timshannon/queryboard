// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as sqlite from "sqlite3";
import crypto from "crypto";
import path from "path";
import * as fs from "fs";

import config from "../config";

const SYSTEMDBNAME = "system.db";


export class Connection {
    private cnn?: sqlite.Database;

    constructor(public readonly filename: string) {}

    public open(): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.mkdir(path.dirname(this.filename), { recursive: true }, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.cnn = new sqlite.Database(this.filename, sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE,
                    (err: Error | null) => {
                        if (err) {
                            this.cnn = undefined;
                            reject(err);
                            return;
                        }
                        resolve();
                    });
            });
        });
    }

    // query runs an unprepared query, all application queries should use prepared statements
    public async query<T>(sql: string, params?: any): Promise<T[]> {
        if (!this.cnn) {
            await this.open();
        }

        return new Promise<T[]>((resolve, reject) => {
            this.cnn!.all(sql, params, (err: Error, rows: T[]) => {
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
            this.cnn!.prepare(sql, (statement: sqlite.Statement, err: Error) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(statement);
            });

        });
    }

    public prepare<Params, Results>(sql: string): (params: Params) => Promise<Results[]> {
        var statement: sqlite.Statement;
        return async (params: Params): Promise<Results[]> => {
            if (!statement) {
                statement = await this.prepStatement(sql);
            }

            return new Promise<Results[]>((resolve, reject) => {
                statement.all(params, (err: Error | null, rows: any[]) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows as Results[]);
                });
            });
        };
    }

    public async beginTran(wrap: () => Promise<void>): Promise<void> {
        if (!this.cnn) {
            await this.open();
        }

        return new Promise<void>(async (resolve, reject) => {
            this.cnn!.serialize(async () => {
                let result;
                try {
                    try {
                        await this.query("BEGIN");
                        result = await wrap();
                        await this.query("COMMIT");
                    } catch (err) {
                        await this.query("ROLLBACK");
                        throw err;
                    }
                } catch (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.cnn) {
                resolve(); // already closed
                return
            }
            this.cnn.close((err: Error | null) => {
                if (err != null) {
                    reject(err);
                    return
                }
                this.cnn = undefined;
                resolve();
            });
        });
    }
}

// random returns a URL safe string of random data of bits size
export function random(bits: number): string {
    return crypto.randomBytes(bits / 8).toString("base64").replace(/\+/g, "").replace(/\//g, "").replace(/\=+$/, "");
}

export const sysdb = new Connection(path.join(config.dataDir, SYSTEMDBNAME));
