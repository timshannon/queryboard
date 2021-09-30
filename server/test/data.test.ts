// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
process.env.DATADIR = ":memory:";

import * as data from "../src/data/data";

const cnn = new data.Connection(":memory:");

describe("data connections", () => {
    beforeEach(() => {
        cnn.query(`
            CREATE TABLE test_data (
                id INT NOT NULL PRIMARY KEY
            )
        `);
    });

    afterEach(() => {
        cnn.query(`
            drop TABLE test_data
        `);
    });

    it("should commit transactions", () => {
        cnn.beginTran(() => {
            cnn.query("insert into test_data values (1)");
            cnn.query("insert into test_data values (2)");
            cnn.query("insert into test_data values (3)");
        });
        const res = cnn.query("select * from test_data");

        expect(res.length).toBe(3);
    });

    it("should rollback transactions on errors", () => {
        try {
            cnn.beginTran(() => {
                cnn.query("insert into test_data values (1)");
                cnn.query("insert into test_data values (2)");
                cnn.query("insert into test_data values (3)");
                throw new Error("Test Error");
            });
        } catch {
            // make sure error doesn't bubble up and fail the test
        }

        const res = cnn.query("select * from test_data");

        expect(res.length).toBe(0);
    });

    it("should handle Date and Boolean values", () => {
        cnn.query(`
            CREATE TABLE test_datatypes (
                id INT NOT NULL PRIMARY KEY,
                valid BOOLEAN,
                the_date DATETIME
            )
        `);


        const record = { id: 1, valid: false, the_date: new Date() };
        const updates = { id: 2, valid: true, the_date: new Date(Date.now() - 10000) };

        const insert = cnn.prepareUpdate<typeof record>("insert into test_datatypes values ($id, $valid, $the_date)");
        const select = cnn.prepareQuery<void, typeof record>("select id, valid, the_date from  test_datatypes");
        const update = cnn.prepareUpdate<typeof record>(`
            update test_datatypes set id = $id, valid = $valid, the_date = $the_date
        `);

        let changes = insert(record);
        expect(changes.changes).toBe(1);

        const res = select();
        expect(res.length).toBe(1);
        expect(res[0].id).toEqual(record.id);
        expect(res[0].valid).toEqual(record.valid);
        expect(res[0].the_date).toEqual(record.the_date);

        changes = update(updates);
        expect(changes.changes).toBe(1);

        const res2 = select();
        expect(res2.length).toBe(1);
        expect(res2[0].id).toEqual(updates.id);
        expect(res2[0].valid).toEqual(updates.valid);
        expect(res2[0].the_date).toEqual(updates.the_date);
    });

});

describe("schema control", () => {
    it("should ensure other schemas", () => {
        const cnnTest = new data.Connection(":memory:", undefined, [
            `
                CREATE TABLE test_data (
                    id INT NOT NULL PRIMARY KEY,
                    test_date DATETIME
                )
                `,
            `
                CREATE TABLE test_data2 (
                    id INT NOT NULL PRIMARY KEY
                )
                `,
            `
                CREATE TABLE test_data3 (
                    id INT NOT NULL PRIMARY KEY
                )
                `,
        ]);

        let res = cnnTest.query("select * from qb_schema_versions");
        expect(res.length).toBe(3);

        res = cnnTest.query(`
            SELECT name 
            FROM sqlite_master
            WHERE type='table'
            and name like 'test_data%'
        `);
        expect(res.length).toBe(3);
    });

});

describe("data random", () => {
    it("return a random url safe string", () => {
        expect(data.random(256)).toMatch(new RegExp("^[a-zA-Z0-9_-]*$"));
    });
});


