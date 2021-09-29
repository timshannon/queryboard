// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import settings from "./settings";
import sql from "./session_sql";
import { User } from "./user";
import { random } from "../data/data";
import * as fail from "../fail";

import { addDays, isBefore } from "date-fns";

interface ISessionFields {
    id: string;
    username: string;
    csrfToken: string;
    csrfDate: Date;
    valid: boolean;
    ipAddress: string;
    expires: Date;
    userAgent?: string;
}

export class Session {
    public static create(user: User, rememberMe: boolean, ipAddress: string, userAgent?: string): Session {
        let expires = addDays(new Date(), 1);
        // if not rememberMe session, then session expires in the browser when it closes, and on the server in 1 day
        if (rememberMe) {
            const days = settings.session.expirationDays.get();
            expires = addDays(new Date(), days);
        }

        const session = new Session({
            id: random(256),
            username: user.username,
            csrfToken: random(256),
            csrfDate: new Date(),
            valid: true,
            ipAddress,
            expires, userAgent,
        });
        session.insert();
        return session;
    }

    public static logoutAll(username: string, exceptSessionID = ""): void {
        sql.invalidateAll({
            username: username,
            session_id: exceptSessionID,
            expires: new Date(),
        });
    }

    public static get(id: string): Session | null {
        const res = sql.get({ session_id: id });
        if (res.length === 0) {
            return null;
        }

        // TODO: if CSRF date is too old, generate a new CSRF token
        // every 15 minutes?

        const row = res[0];

        const session = new Session({
            id: row.session_id,
            username: row.username,
            csrfToken: row.csrf_token,
            csrfDate: row.csrf_date,
            valid: row.valid,
            ipAddress: row.ip_address,
            expires: row.expires,
            userAgent: row.user_agent,
        });

        if (!session.valid || isBefore(session.expires, new Date())) {
            return null;
        }

        return session;
    }

    public readonly id: string;
    public readonly username: string;
    public readonly csrfToken: string;
    public readonly csrfDate: Date;
    public readonly valid: boolean;
    public readonly ipAddress: string;
    public readonly expires: Date;
    public readonly userAgent?: string;

    private _user?: User;

    constructor(args: ISessionFields) {
        this.id = args.id;
        this.username = args.username;
        this.csrfToken = args.csrfToken;
        this.csrfDate = args.csrfDate;
        this.valid = args.valid;
        this.ipAddress = args.ipAddress;
        this.expires = args.expires;
        this.userAgent = args.userAgent;
    }

    public insert(): void {
        this.validate();
        sql.insert({
            session_id: this.id,
            username: this.username,
            valid: this.valid,
            csrf_token: this.csrfToken,
            csrf_date: this.csrfDate,
            ip_address: this.ipAddress,
            user_agent: this.userAgent || "",
            expires: this.expires,
            created_date: new Date(),
        });

    }

    public user(): User {
        if (this._user) {
            return this._user;
        }

        this._user = User.get(this, this.username);
        return this._user;
    }

    public IsAdmin(): boolean {
        return (this.user()).admin;
    }

    // logs out of the a session
    public logout(): void {
        sql.logout({ session_id: this.id });
    }


    private validate() {
        if (!this.username || !this.csrfToken || !this.ipAddress || !this.expires) {
            throw new fail.Failure("Invalid session");
        }
    }

}

// export class History {
//     public static async get(session: Session, limit: number = 5, offset: number = 0): Promise<data.IPage<History>> {
//         const res = await pool.query(data.statement(sql.history, session.userID).paged(limit, offset));

//         const history: History[] = [];
//         for (const row of res.rows) {
//             history.push(new History(row.user_id, row.auth_type, row.valid, row.ip_address, row.expires,
//                 row.user_agent, row.created_date));
//         }

//         return {
//             page: res.page,
//             total: res.total,
//             pages: res.pages,
//             data: history,
//         };
//     }

//     constructor(
//         public readonly userID: uuid.ID,
//         public readonly authType: auth,
//         public readonly valid: boolean,
//         public readonly ipAddress: string,
//         public readonly expires: Date,
//         public readonly userAgent: string,
//         public readonly createdDate: Date,
//     ) {}

// }

