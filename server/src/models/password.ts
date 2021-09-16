// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import config from "../config";
import sql from "./password_sql";
import { Session } from "./session";
import { User } from "./user";
import userSQL from "./user_sql";

import * as pwdSvc from "../services/password";
import settings from "../services/settings";

import { addDays, addMinutes, isBefore } from "date-fns";
import { data, email as emailTemplate, fail, security, uuid, validation } from "lib-svc-common";
import url from "url";

const forgotPasswordExpirationMinutes = 15;

interface IPasswordFields {
    userID: uuid.ID;
    version: number;
    hash: string;
    hashVersion: number;
    expiration?: Date;
    sessionID?: string;
    createdBy?: uuid.ID;
    createdDate?: Date;
    updatedBy?: uuid.ID;
    updatedDate?: Date;
}

export class Password {
    public static async create(userID: uuid.ID, password: string, createdBy: uuid.ID,
        sessionID?: string): Promise<Password> {
        if (!await settings.auth.password.get()) {
            throw new fail.Failure("Creating new users with password authentication is currently not allowed");
        }
        const expireDays = await settings.password.expirationDays.get();
        let expiration: undefined | Date;
        if (expireDays !== 0) {
            expiration = addDays(new Date(), expireDays);
        }

        await pwdSvc.validate(password);
        const hash = await pwdSvc.versions[pwdSvc.currentVersion].hash(password);

        return new Password({
            userID,
            version: 0,
            hash,
            hashVersion: pwdSvc.currentVersion,
            expiration,
            sessionID,
            createdBy,
            createdDate: new Date(),
        });
    }

    public static async get(userID: uuid.ID, cnn: data.IConnection = pool): Promise<Password> {
        const res = await cnn.query(sql.get, userID);
        if (res.rowCount === 0) {
            throw new fail.NotFound(`No password found for user ${userID}`);
        }

        const row = res.rows[0];

        return new Password({
            userID: row.user_id,
            version: row.version,
            hash: row.hash,
            hashVersion: row.hash_version,
            expiration: row.expiration,
            sessionID: row.session_id,
            createdBy: row.created_by,
            createdDate: row.created_date,
        });
    }

    public static async login(email: string, password: string, rememberMe: boolean, ipAddress: string,
        userAgent?: string): Promise<Session> {
        const errLogin = new fail.Failure("Invalid user or password");

        // TODO: Ratelimit password attempts
        return await pool.beginTran(async (tx: data.Transaction): Promise<any> => {
            const res = await tx.query(sql.login, email.toLowerCase());

            if (res.rowCount === 0) {
                throw errLogin;
            }

            const row = res.rows[0];

            const user = User.fromRow(row);
            const pwd = new Password({
                userID: user.id,
                version: row.version,
                hash: row.hash,
                hashVersion: row.hash_version,
                expiration: row.expiration,
            });

            if (!user.active()) {
                throw errLogin;
            }

            if (pwd.expired()) {
                throw new fail.Failure("Your password has expired");
            }

            if (!await pwd.compare(password)) {
                throw errLogin;
            }

            return await Session.create(user, auth.password, rememberMe, ipAddress, userAgent, tx);
        });
    }

    public static async forgotRequest(email: string): Promise<void> {
        validation.isEmail(email);
        const res = await pool.query(userSQL.user.getByEmail, email);
        if (res.rowCount === 0) {
            // return silently without acknowledging if the email address exists or not
            return;
        }

        const userID = res.rows[0].user_id;

        await pool.beginTran(async (tx: data.Transaction) => {
            const token = data.random(256);
            const expires = addMinutes(new Date(), forgotPasswordExpirationMinutes);
            await tx.query(sql.forgot.insert, token, userID, expires, new Date());
            await svcEmail.send(email, "Password change request", emailTemplate.baseTemplate.template(`
                <h1 align="center">Password change request</h1>
                <br>
                <p>A request was made to reset your password.  Please click below to set a new password.
                The link is only valid for the next ${forgotPasswordExpirationMinutes} minutes.</p>
                <p>If you did NOT request this change, you can safely ignore this email.</p>
                <br>
                ${emailTemplate.baseTemplate.button("Click Here To Set Your Password",
                url.resolve(config.common.baseURL, "forgot-password/" + token))}`));
        });

    }

    public static async forgotRetrieveRequest(token: string, cnn: data.IConnection = pool): Promise<User> {
        let res = await cnn.query(sql.forgot.get, token, new Date());
        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }

        const req = res.rows[0];
        res = await cnn.query(userSQL.user.get, req.user_id);

        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }

        const user = User.fromRow(res.rows[0]);
        if (!user.active()) {
            throw new fail.NotFound();
        }
        return user;
    }

    public static async forgotClaimRequest(token: string, newPassword: string, ipAddress: string,
        userAgent?: string): Promise<Session> {
        return await pool.beginTran(async (tx: data.Transaction): Promise<Session> => {
            const user = await Password.forgotRetrieveRequest(token, tx);

            await tx.query(sql.forgot.claim, new Date(), token);

            const pass = await Password.get(user.id, tx);

            const s = await Session.create(user, auth.password, false, ipAddress, userAgent, tx);
            await pass.update(newPassword, user.id, s, tx);

            return s;
        });
    }

    public readonly userID: uuid.ID;
    public readonly version: number;
    public readonly hash: string;
    public readonly hashVersion: number;
    public readonly expiration?: Date;
    public readonly sessionID?: string;
    public readonly createdBy?: uuid.ID;
    public readonly createdDate?: Date;
    public readonly updatedBy?: uuid.ID;
    public readonly updatedDate?: Date;
    constructor(args: IPasswordFields) {
        this.userID = args.userID;
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

    public async insert(cnn: data.IConnection = pool): Promise<void> {
        await cnn.query(sql.insert, this.userID, this.version, this.hash, this.hashVersion, this.expiration,
            this.sessionID, this.updatedDate, this.updatedBy, this.createdDate, this.createdBy);
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
            throw new Error(`User with id ${this.userID} has an invalid password hash version of ` +
                this.hashVersion);
        }

        return pwdVer.compare(otherPassword, this.hash);
    }

    /* Scenarios in which a password can be set:
        * Already logged in user is changing their own password
        * Admin is changing an other user's password
        * Password resets from emailed token
     */
    public async update(password: string, who: uuid.ID, session: security.ISession,
        tx: data.Transaction): Promise<void> {
        if (!await settings.auth.password.get()) {
            throw new fail.Failure("Password authentication is currently not allowed");
        }

        await pwdSvc.validate(password);

        if (await this.compare(password)) {
            throw new fail.Failure("Your new password cannot match your previous password");
        }

        const reuse = await settings.password.reuseCheck.get();
        if (reuse > 0) {
            // test each previous password using that passwords hash version
            const res = await tx.query(sql.history.get, this.userID, reuse);
            for (const row of res.rows) {
                const passHistory = new Password({
                    userID: row.user_id,
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

        await tx.query(sql.history.insert, this.userID, this.version, this.hash, this.hashVersion,
            this.sessionID, this.updatedDate, this.updatedBy);
        await tx.query(sql.update, this.userID, this.version, hash, pwdSvc.currentVersion, expires,
            session.id, new Date(), who);
        await Session.logoutAll(this.userID, tx, session.id);
    }
}

