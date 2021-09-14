// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import log from "../log";
import * as sqlite from "sqlite3";

import crypto from "crypto";

export class Connection {
    private cnn: sqlite.Database;

    constructor(public readonly filename: string) {
        this.cnn = new sqlite.Database(filename, sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE);

        this.cnn.on("error", (err: Error) => {
            log.error(err);
        });
    }

    // query runs an unprepared query, all application queries should use
    public query<T>(sql: string): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            this.cnn.all(sql, (_: sqlite.Statement, err: Error, rows: T[]) => {
                if (err != null) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    public prepare(sql: string): Promise<Statement> {
        return new Promise<Statement>((resolve, reject) => {
            this.cnn.prepare(sql, (statement: sqlite.Statement, err: Error) => {
                if (err != null) {
                    reject(err);
                    return;
                }
                resolve(new Statement(statement));
            });
        });
    }

    public async beginTran(wrap: () => Promise<void>): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            return this.cnn.serialize(async () => {
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
            this.cnn.close(reject);
            resolve();
        });
    }

}

class Statement {
    constructor(private stmt: sqlite.Statement) {}

    public exec<T>(params: any[]): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            this.stmt.all(params, (err: Error, rows: any[]) => {
                if (err != null) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

}



// export class Transaction {
//     private active: boolean = false;

//     constructor() {}

//     public query<T>(stmt: sqlite.Statement, ...parameters: any[]): Promise<T[]> {
//         if (!this.active) {
//             throw new Error("Cannot run a new query on a closed transaction");
//         }
//         return this.client.query(stmt, parameters);
//     }

//     public async begin(): Promise<void> {
//         if (this.active) {
//             throw new Error("Cannot begin a new transaction when one is already open");
//         }

//         try {
//             await this.client.query("BEGIN");
//             this.active = true;
//         } catch (err) {
//             this.active = false;
//             throw err;
//         }

//         return;
//     }

//     public async commit(): Promise<void> {
//         if (!this.active) {
//             throw new Error("Cannot commit a closed transaction");
//         }

//         try {
//             await this.client.query("COMMIT");
//         } catch (err) {
//             this.active = false;
//             throw err;
//         }

//     }

//     public async rollback(): Promise<void> {
//         if (!this.active) {
//             throw new Error("Cannot rollback a closed transaction");
//         }

//         try {
//             await this.client.query("ROLLBACK");
//         } catch (err) {
//             this.active = false;
//             throw err;
//         }
//     }
// }

// random returns a URL safe string of random data of bits size
export function random(bits: number): string {
    return crypto.randomBytes(bits / 8).toString("base64").replace(/\+/g, "").replace(/\//g, "").replace(/\=+$/, "");
}

