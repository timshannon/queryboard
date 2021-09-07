// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import log from "./log";
import sysSchema from "./schema";

const sql = {
    insertSchema: `
        insert into schema_versions (version, script, locked, run_date)
        values ($version, $script, $locked, $run_date)
    `,
    getLastSchema: `
        select version, locked from schema_versions order by version desc limit 1
    `,
    lockSchema: `
        update schema_versions set locked=TRUE where version = $version
    `,
};

export async function ensureSchema(): Promise<void> {
    await ensureDatabase(schemaCFG);

    const cnn = new data.Connection(schemaCFG);

    const sysCnn = new data.Connection(config.system);

    // ensure common / system schema first before service's schema
    await sysCnn.beginTran(async (sysTx): Promise<void> => {
        await ensureSchemaTable(sysTx);
        await ensureSchemaVer(sysSchema, sysTx, sysTx);
    });

    if (schema) {
        await sysCnn.beginTran(async (sysTx): Promise<void> => {
            return cnn.beginTran(async (tx): Promise<void> => {
                await ensureSchemaVer(schema, sysTx, tx);
            });
        });
    }

    await cnn.close();
    await sysCnn.close();
}

/* Verifies that the database exists for the connection pool to connect to.
   It'll create the database if one does not exist.*/
async function ensureDatabase(cfg: data.IDataCFG): Promise<void> {
    const client = new pg.Client({
        user: cfg.user,
        password: cfg.password,
        database: "postgres",
        host: cfg.host,
        port: cfg.port,
    });

    client.on("error", (err: Error) => {
        throw err;
    });

    client.connect((err: Error) => {
        if (err) {
            throw err;
        }
    });

    try {
        const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${cfg.database}'`);

        if (result.rowCount === 1) {
            // database already exists
            client.end();
            return;
        }

        log.info(`Creating database ${cfg.database}`);
        await client.query(`create database ${cfg.database}`);
        client.end();
    } catch (err) {
        client.end();
        throw err;
    }
    return;
}

async function ensureSchemaTable(cnn: data.IConnection): Promise<void> {
    await ensureSchemaExists(cnn, sysSchema.name);

    const result = await cnn.query(`
      select table_name
      from information_schema.tables
      where table_name = 'schema_versions'
    `);

    if (result.rowCount !== 0) {
        // table already exists
        return;
    }

    log.info("Creating schema_versions table");
    await cnn.query(sysSchema.scripts[0]);
    await cnn.query(sql.insertSchema, 0, sysSchema.name, sysSchema.scripts[0], false, new Date());
}

async function ensureSchemaExists(cnn: data.IConnection, schema: string): Promise<void> {
    const res = await cnn.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", schema);
    if (res.rowCount !== 0) {
        // schema already exists
        return;
    }

    await cnn.query(`create schema ${schema}`);
}

async function ensureSchemaVer(schema: ISchema, sysCnn: data.IConnection, cnn: data.IConnection): Promise<void> {
    const currentVer = schema.scripts.length - 1;
    const res = await sysCnn.query(sql.getLastSchema, schema.name);
    let dbVer = -1;

    if (res.rowCount > 0) {
        if (res.rows[0].locked) {
            log.info("schema table locked. Waiting...");
            setTimeout(async () => {
                await ensureSchemaVer(schema, sysCnn, cnn);
            }, 1000);
            return;
        }

        dbVer = res.rows[0].version;
    }

    if (dbVer === currentVer) {
        // database is already current
        return;
    }

    if (dbVer < currentVer) {
        if (dbVer === -1) {
            await ensureSchemaExists(cnn, schema.name);
        } else {
            await sysCnn.query(sql.lockSchema, schema.name, dbVer);
        }
        dbVer++;

        log.info(`Updating schema ${schema.name} to version ${dbVer}`);
        await cnn.query(schema.scripts[dbVer]);
        await sysCnn.query(sql.insertSchema, dbVer, schema.name, schema.scripts[dbVer], false, new Date());
        await ensureSchemaVer(schema, sysCnn, cnn);
        return;
    }

    const err = new Error(`Schema ${schema.name} version ${dbVer} is newer than the code schema version ${currentVer}`);
    if (schema.name === sysSchema.name) {
        // services may be built on different versions of the system schema.  All system schema changes should be
        // backwards compatible, but we should log a warning so we know which services to update
        log.warning(err);
    } else {
        throw err;
    }
}

// removeSchema removes all the tables for under the passed in schema, and removes the records
// from the schema_versions table. For use in testing.
export async function removeSchema(cfg: data.IDataCFG, schemaName = sysSchema.name): Promise<void> {
    // NOTE: Jest will set NODE_ENV to test if it is unset
    if (process.env.NODE_ENV !== "test") {
        throw new Error(`Node environment is ${process.env.NODE_ENV} not "test".  Will not reset schema`);
    }

    const cnn = new data.Connection({
        user: config.schema.user,
        password: config.schema.password,
        database: cfg.database,
        host: cfg.host,
        port: cfg.port,
        max: cfg.min,
        min: cfg.max,
        idleTimeoutMillis: cfg.idleTimeoutMillis,
        connectionTimeoutMillis: cfg.connectionTimeoutMillis,
    });

    const sysCnn = new data.Connection(config.system);
    await ensureSchemaTable(sysCnn);

    if (schemaName === sysSchema.name) {
        // drop all schemas
        const res = await sysCnn.query(sql.getSchemaList);
        for (const row of res.rows) {
            await removeSchema(cfg, row.name);
        }
    }

    await sysCnn.beginTran(async (sysTx): Promise<void> => {
        return cnn.beginTran(async (tx): Promise<void> => {
            const res = await tx.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", schemaName);
            if (res.rowCount !== 0) {
                await tx.query(`DROP SCHEMA ${schemaName} CASCADE;`);
            }

            if (schemaName !== sysSchema.name) {
                await sysTx.query(sql.deleteSchema, schemaName);
            }
        });
    });
    await cnn.close();
    await sysCnn.close();
}

export async function schemaVersions(): Promise<any> {
    const cnn = new data.Connection(config.system);
    const res = await cnn.query(sql.getSchemaVersions);

    const versions: any = {};

    for (const row of res.rows) {
        versions[row.name] = row.version;
    }

    return versions;
}

