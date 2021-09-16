// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import { sysdb } from "../data/data";

export default {
    insert: sysdb.prepareUpdate<{
        $session_id: string,
        $username: string,
        $valid: boolean,
        $csrf_token: string,
        $csrf_date: Date,
        $ip_address: string,
        $user_agent: string,
        $expires: Date,
        $created_date: Date,
    }>(`
        insert into sessions (
            session_id,
            username,
            valid,
            csrf_token,
            csrf_date,
            ip_address,
            user_agent,
            expires,
            created_date
        ) values (
            $session_id,
            $username,
            $valid,
            $csrf_token,
            $csrf_date,
            $ip_address,
            $user_agent,
            $expires,
            $created_date,
        )
    `),
    logout: sysdb.prepareUpdate<{
        $session_id: string,
    }>(`
        update sessions set valid = FALSE where session_id = $session_id
    `),
    get: sysdb.prepareQuery<{
        $session_id: string,
    }, {
        session_id: string,
        username: string,
        valid: boolean,
        ip_address: string,
        user_agent: string,
        csrf_token: string,
        csrf_date: Date,
        expires: Date,
    }>(`
        select  session_id, 
                username,   
                valid,  
                ip_address,
                user_agent,
                csrf_token,  
                csrf_date, 
                expires
        from    sessions
        where   session_id = $session_id
    `),
    history: sysdb.prepareQuery<{
        $username: string,
    }, {
        username: string,
        valid: boolean,
        ip_address: string,
        user_agent: string,
        expires: Date,
        created_date: Date,
    }>(`
        select
            username,
            valid,
            ip_address,
            user_agent,
            expires,
            created_date
        from sessions
        where username = $username
        order by created_date desc
    `),
    updateCSRF: sysdb.prepareUpdate<{
        $csrf_token: string,
        $session_id: string,
    }>(`update sessions set csrf_token = $csrf_token where session_id = $session_id`),
    invalidateAll: sysdb.prepareUpdate<{
        $username: string,
        $session_id: string,
        $expires: Date,
    }>(`
        update  sessions
        set     valid = FALSE
        where   username = $username
        and     session_id <> $session_id
        and     expires >= $expires
        and     valid = TRUE
    `),
};


