// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { sysdb } from "../data/data";

export default {
    login: sysdb.prepareQuery<{
        username: string,
    }, {
        username: string,
        admin: boolean,
        start_date: Date,
        end_date: Date,
        hash: string,
        version: number,
        hash_version: number,
        expiration: Date,
    }>(`
        select  u.username, 
                u.admin,
                u.start_date, 
                u.end_date, 
                p.hash, 
                p.version, 
                p.hash_version,
                p.expiration
        from    users u
                inner join passwords p 
                    on u.username = p.username
        where   u.username = $username
    `),
    get: sysdb.prepareQuery<{
        username: string,
    }, {
        username: string,
        hash: string,
        version: number,
        hash_version: number,
        expiration: Date,
        session_id: string,
        created_by: string,
        created_date: Date,
    }>(`
        select  username, 
                hash,  
                version, 
                hash_version,  
                expiration,   
                session_id, 
                created_by,
                created_date
        from    passwords
        where   username = $username
    `),
    insert: sysdb.prepareUpdate<{
        username: string,
        version: number,
        hash: string,
        hash_version: number,
        expiration?: Date,
        session_id: string,
        updated_date: Date,
        updated_by: string,
        created_date: Date,
        created_by: string,
    }>(`
        insert into passwords (
            username,
            version,
            hash,
            hash_version,
            expiration,
            session_id,
            updated_date,
            updated_by,
            created_date,
            created_by
        ) values (
            $username,
            $version,
            $hash,
            $hash_version,
            $expiration,
            $session_id,
            $updated_date,
            $updated_by,
            $created_date,
            $created_by
        )
    `),
    update: sysdb.prepareUpdate<{
        username: string,
        version: number,
        hash: string,
        hash_version: number,
        expiration?: Date,
        session_id: string,
        updated_date: Date,
        updated_by: string,
    }>(`
        update  passwords
        set     hash = $hash,
                hash_version = $hash_version,
                expiration = $expiration,
                session_id = $session_id,
                updated_date = $updated_date,
                updated_by = $updated_by,
                version = version + 1
        where   username = $username
        and     version = $version
    `),
    history: {
        get: sysdb.prepareQuery<{
            username: string,
            limit: number,
        }, {
            username: string,
            version: number,
            hash: string,
            hash_version: number,
        }>(`
            select  username, 
                    version, 
                    hash, 
                    hash_version
            from  password_history
            where username = $username
            order by version desc
            LIMIT $limit
        `),
        insert: sysdb.prepareUpdate<{
            username: string,
            version: number,
            hash: string,
            hash_version: number,
            session_id: string,
            created_date: Date,
            created_by: string,
        }>(`
            insert into password_history (
                username,
                version,
                hash,
                hash_version,
                session_id,
                created_date,
                created_by
            ) values (
                $username,
                $version,
                $hash,
                $hash_version,
                $session_id,
                $created_date,
                $created_by
            )
        `),
    },
};

