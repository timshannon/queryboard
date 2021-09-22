// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import log from "../log";
import * as data from "./data";

type Schema = string[];

const sql = {
    createTable: `
        CREATE TABLE qb_schema_versions (
            version INT NOT NULL,
            script TEXT NOT NULL,
            locked INT NOT NULL,
            run_date REAL NOT NULL,
            PRIMARY KEY(version)
        )
    `,
    tableExists: `
        SELECT name 
        FROM sqlite_master
        WHERE type='table'
        and name = 'qb_schema_versions'
    `,
    insertSchema: `
        insert into qb_schema_versions (version, script, locked, run_date)
        values ($version, $script, $locked, $run_date)
    `,
    getLastSchema: `
        select version, locked from qb_schema_versions order by version desc limit 1
    `,
    lockSchema: `
        update qb_schema_versions set locked=TRUE where version = $version
    `,
};

export async function ensureSchema(cnn: data.Connection, schema: Schema): Promise<void> {
    await cnn.beginTran(async (): Promise<void> => {
        await ensureSchemaTable(cnn);
        await ensureSchemaVer(schema, cnn);
    });
}

async function ensureSchemaTable(cnn: data.Connection): Promise<void> {
    const result = await cnn.query<{ name: string }>(sql.tableExists);

    if (result.length !== 0) {
        // table already exists
        return;
    }

    log.info("Creating schema_versions table");
    await cnn.query(sql.createTable);
}


async function ensureSchemaVer(schema: Schema, cnn: data.Connection): Promise<void> {
    const currentVer = schema.length - 1;
    const res = await cnn.query<{ version: number, locked: boolean }>(sql.getLastSchema);
    let dbVer = -1;

    if (res.length > 0) {
        if (res[0].locked) {
            log.info("schema table locked. Waiting...");
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    ensureSchemaVer(schema, cnn)
                        .then(resolve)
                        .catch(reject);

                }, 1000);
            });
            return;
        }

        dbVer = res[0].version;
    }

    if (dbVer === currentVer) {
        // database is already current
        return;
    }

    if (dbVer < currentVer) {
        await cnn.query(sql.lockSchema, { $version: dbVer });
        dbVer++;

        log.info(`Updating schema  in ${cnn.filepath} to version ${dbVer}`);
        await cnn.query(schema[dbVer]);
        await cnn.query(sql.insertSchema, {
            $version: dbVer,
            $script: schema[dbVer],
            $locked: false,
            $run_date: new Date(),
        });
        await ensureSchemaVer(schema, cnn);
        return;
    }

    throw new Error(`The schema in ${cnn.filepath} version ${dbVer} is newer than the code schema version ${currentVer}`);
}
