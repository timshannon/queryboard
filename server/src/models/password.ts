// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import sql from "./password_sql";
import { Session } from "./session";
import { User } from "./user";
import { sysdb } from "../data/data";

import * as pwdSvc from "../services/password";
import settings from "./settings";

import { addDays, isBefore } from "date-fns";
import * as fail from "../fail";

interface IPasswordFields {
    username: string;
    version: number;
    hash: string;
    hashVersion: number;
    expiration?: Date;
    sessionID?: string;
    createdBy?: string;
    createdDate?: Date;
    updatedBy?: string;
    updatedDate?: Date;
}

export class Password {
    public static async create(username: string, password: string, createdBy: User,
        sessionID?: string): Promise<Password> {

        const expireDays = await settings.password.expirationDays.get();
        let expiration: undefined | Date;
        if (expireDays !== 0) {
            expiration = addDays(new Date(), expireDays);
        }

        await pwdSvc.validate(password);
        const hash = await pwdSvc.versions[pwdSvc.currentVersion].hash(password);

        return new Password({
            username,
            version: 0,
            hash,
            hashVersion: pwdSvc.currentVersion,
            expiration,
            sessionID,
            createdBy: createdBy.username,
            createdDate: new Date(),
        });
    }

    public static async get(username: string): Promise<Password> {
        const res = await sql.get({ $username: username });
        if (res.length === 0) {
            throw new fail.NotFound(`No password found for user ${username}`);
        }

        const row = res[0];

        return new Password({
            username: row.username,
            version: row.version,
            hash: row.hash,
            hashVersion: row.hash_version,
            expiration: row.expiration,
            sessionID: row.session_id,
            createdBy: row.created_by,
            createdDate: row.created_date,
        });
    }

    public static async login(username: string, password: string, rememberMe: boolean, ipAddress: string,
        userAgent?: string): Promise<Session> {
        const errLogin = new fail.Failure("Invalid user or password");

        // TODO: Ratelimit password attempts
        return await sysdb.beginTran<Session>(async (): Promise<Session> => {
            const res = await sql.login({ $username: username });

            if (res.length === 0) {
                throw errLogin;
            }

            const row = res[0];

            const user = User.fromRow(row);
            const pwd = new Password({
                username: user.username,
                version: row.version,
                hash: row.hash,
                hashVersion: row.hash_version,
                expiration: row.expiration,
            });

            if (!user.active()) {
                throw errLogin;
            }

            if (pwd.expired()) {
                throw new fail.Failure("Your password has expired, you must pick a new password");
            }

            if (!await pwd.compare(password)) {
                throw errLogin;
            }

            return await Session.create(user, rememberMe, ipAddress, userAgent);
        });
    }

    public readonly username: string;
    public readonly version: number;
    public readonly hash: string;
    public readonly hashVersion: number;
    public readonly expiration?: Date;
    public readonly sessionID?: string;
    public readonly createdBy?: string;
    public readonly createdDate?: Date;
    public readonly updatedBy?: string;
    public readonly updatedDate?: Date;
    constructor(args: IPasswordFields) {
        this.username = args.username;
        this.version = args.version;
        this.hash = args.hash;
        this.hashVersion = args.hashVersion;
        this.expiration = args.expiration;
        this.sessionID = args.sessionID;
        this.createdBy = args.createdBy;
        this.createdDate = args.createdDate;
        this.updatedBy = args.updatedBy || args.createdBy;
        this.updatedDate = args.updatedDate || args.createdDate;
    }

    public async insert(): Promise<void> {
        if (!this.sessionID || !this.updatedDate || !this.updatedBy || !this.createdDate || !this.createdBy) {
            throw new Error("Cannot insert password due to missing fields");
        }

        await sql.insert({
            $username: this.username,
            $version: this.version,
            $hash: this.hash,
            $hash_version: this.hashVersion,
            $expiration: this.expiration,
            $session_id: this.sessionID,
            $updated_date: this.updatedDate,
            $updated_by: this.updatedBy,
            $created_date: this.createdDate,
            $created_by: this.createdBy,
        });
    }

    public expired(): boolean {
        if (this.expiration) {
            return isBefore(this.expiration, new Date());
        }
        return false;
    }

    public async compare(otherPassword: string): Promise<boolean> {
        const pwdVer = pwdSvc.versions[this.hashVersion];

        if (!pwdVer) {
            throw new Error(`User ${this.username} has an invalid password hash version of ${this.hashVersion}`);
        }

        return pwdVer.compare(otherPassword, this.hash);
    }

    /* Scenarios in which a password can be set:
        * Already logged in user is changing their own password
        * Admin is changing an other user's password
        * Password resets from emailed token
     */
    public async update(password: string, session: Session): Promise<void> {
        await pwdSvc.validate(password);

        if (await this.compare(password)) {
            throw new fail.Failure("Your new password cannot match your previous password");
        }

        const reuse = await settings.password.reuseCheck.get();
        if (reuse > 0) {
            // test each previous password using that passwords hash version
            const res = await sql.history.get({ $username: this.username, $limit: reuse });
            for (const row of res) {
                const passHistory = new Password({
                    username: row.username,
                    version: row.version,
                    hash: row.hash,
                    hashVersion: row.hash_version,
                });

                if (await passHistory.compare(password)) {
                    throw new fail.Failure(`Your new password cannot match your previous ${reuse + 1} passwords`);
                }
            }
        }

        const hash = await pwdSvc.versions[pwdSvc.currentVersion].hash(password);
        const expireDays = await settings.password.expirationDays.get();
        let expires: undefined | Date;
        if (expireDays !== 0) {
            expires = addDays(new Date(), expireDays);
        }

        if (!this.sessionID || !this.updatedDate || !this.updatedBy || !this.createdDate || !this.createdBy) {
            throw new Error("Cannot insert password history due to missing fields");
        }

        await sql.history.insert({
            $username: this.username,
            $version: this.version,
            $hash: this.hash,
            $hash_version: this.hashVersion,
            $session_id: this.sessionID,
            $created_date: this.updatedDate,
            $created_by: this.updatedBy,
        });

        await sql.update({
            $username: this.username,
            $version: this.version,
            $hash: hash,
            $hash_version: pwdSvc.currentVersion,
            $expiration: expires,
            $session_id: session.id,
            $updated_date: new Date(),
            $updated_by: session.username,
        });

        await Session.logoutAll(this.username, session.id);
    }
}

