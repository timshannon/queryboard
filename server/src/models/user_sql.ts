// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { sysdb } from "../data/data";

export default {
    user: {
        insert: sysdb.prepareUpdate<{
            $username: string,
            $admin: boolean,
            $start_date: Date,
            $end_date?: Date,
            $version: number,
            $updated_date: Date,
            $created_date: Date,
            $created_by: string,
            $updated_by: string,
        }>(`
            insert into users (
                username,
                admin,
                start_date,
                end_date,
                version,
                updated_date,
                created_date,
                created_by,
                updated_by
            ) values (
                $username,
                $admin,
                $start_date,
                $end_date,
                $version,
                $updated_date,
                $created_date,
                $created_by,
                $updated_by
            )
        `),
        get: sysdb.prepareQuery<{
            $username: string,
        }, {
            username: string,
            admin: boolean,
            start_date: Date,
            end_date: Date,
            version: number,
            updated_date: Date,
            created_date: Date,
            created_by: string,
            updated_by: string,
        }>(`
            select  username,
                    admin,
                    start_date,
                    end_date,
                    version,
                    updated_date,
                    created_date,
                    created_by,
                    updated_by
            from users
            where username = $username
        `),
        update: sysdb.prepareUpdate<{
            $username: string,
            $version: number,
            $admin: boolean,
            $start_date: Date,
            $end_date?: Date,
            $updated_date: Date,
            $updated_by: string,
        }>(`
            update  users
            set     admin = $admin,   
                    start_date = $start_date,
                    end_date = $end_date,
                    updated_date = $updated_date,
                    updated_by = $updated_by,
                    version = version + 1
            where   username = $username
            and     version = $version
        `),
        count: sysdb.prepareQuery<void, { count: number }>(`
            select  count(*) as count
            from    users
        `),
    },
};

