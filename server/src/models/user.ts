// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { sysdb, random } from "../data/data";
import log from "../log";
import { Session } from "./session";
import { Password } from "./password";
import * as pwdSvc from "../services/password";
import sql from "./user_sql";
import * as fail from "../fail";
import config from "../config";

import { isAfter, isBefore, addSeconds, addDays } from "date-fns";

const maxNameLength = 500;
const testUsername = /^[a-zA-Z0-9-_]*$/i;

interface IUserFields {
    username: string;
    admin?: boolean;
    version: number;
    startDate: Date;
    endDate?: Date;
    updatedDate?: Date;
    createdDate?: Date;
    createdBy?: string;
    updatedBy?: string;
}

interface IUpdates {
    version: number;
    startDate?: Date;
    endDate?: Date;
}

export class User {
    public static create(session: Session, username: string, tempPassword: string, admin: boolean): User {
        const who = session.user();
        if (!who.admin) {
            throw new fail.Unauthorized("Only admins can create new users");
        }

        const newUser = new User({
            username,
            version: 0,
            startDate: new Date(),
            admin,
        });

        const pwd = Password.create(username, tempPassword, who, session.id);

        sysdb.beginTran(() => {
            newUser.insert(who.username);
            pwd.insert();
        });
        return newUser;
    }


    public static get(session: Session, username: string): User {
        if (session.username !== username && !session.IsAdmin()) {
            throw new fail.Unauthorized("Only admins can view other user records");
        }

        const res = sql.user.get({ username });

        if (res.length === 0) {
            throw new fail.NotFound();
        }

        return User.fromRow(res[0]);
    }

    // ensureAdmin ensures that at least one active admin exists.  If one doesn't it will create one
    // with a random password
    public static ensureAdmin(): void {
        if ((sql.user.count())[0].count > 0) {
            return;
        }

        const username = "admin";
        const tempPassword = config.startupPassword || random(256);

        const newUser = new User({
            username,
            version: 0,
            startDate: new Date(),
            admin: true,
        });

        const fakeSession = new Session({
            id: random(256),
            username,
            csrfToken: random(256),
            csrfDate: new Date(),
            valid: true,
            ipAddress: "fakeSessionForFirstUser",
            expires: addSeconds(new Date(), 10),
            userAgent: "fakeSessionForFirstUser",
        });


        const hash = pwdSvc.versions[pwdSvc.currentVersion].hash(tempPassword);

        const pwd = new Password({
            username,
            version: 0,
            hash,
            hashVersion: pwdSvc.currentVersion,
            expiration: addDays(new Date(), 1),
            sessionID: fakeSession.id,
            createdBy: username,
            createdDate: new Date(),
        });

        sysdb.beginTran(() => {
            newUser.insert("");
            fakeSession.insert();
            pwd.insert();
        });

        log.info(`No users found, "admin" user created with password "${tempPassword}"`);
    }


    public static fromRow(row: {
        username: string,
        admin: boolean,
        start_date: Date,
        end_date?: Date,
        version: number,
        updated_date?: Date,
        created_date?: Date,
        created_by?: string,
        updated_by?: string,
    }): User {
        return new User({
            username: row.username,
            admin: row.admin,
            version: row.version,
            startDate: row.start_date,
            endDate: row.end_date,
            updatedDate: row.updated_date,
            createdDate: row.created_date,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
        });
    }

    public readonly username: string;
    public readonly version: number;
    public admin: boolean;
    public startDate: Date;
    public endDate?: Date;
    public readonly updatedDate?: Date;
    public readonly createdDate?: Date;
    public readonly createdBy?: string;
    public readonly updatedBy?: string;
    constructor(args: IUserFields) {
        this.username = args.username;
        this.version = args.version;
        this.admin = args.admin || false;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
        this.updatedDate = args.updatedDate;
        this.updatedBy = args.updatedBy;
        this.createdBy = args.createdBy;
        this.createdDate = args.createdDate;
    }

    public active(theDate: Date = new Date()): boolean {
        if (this.endDate) {
            if (isBefore(this.endDate, theDate)) {
                return false;
            }
        }
        return isAfter(theDate, this.startDate);
    }

    public update(session: Session, updates: IUpdates): void {
        if (updates.startDate) {
            if (!(session.IsAdmin())) {
                throw new fail.Unauthorized("Only admins can update a user's start date");
            }
            this.startDate = updates.startDate;
        }

        if (updates.endDate) {
            if (!(session.IsAdmin())) {
                throw new fail.Unauthorized("Only admins can update a user's end date");
            }
            this.endDate = updates.endDate;
        }

        this.validate();

        const res = sql.user.update({
            username: this.username,
            version: updates.version,
            admin: this.admin,
            start_date: this.startDate,
            end_date: this.endDate,
            updated_date: new Date(),
            updated_by: session.username,
        });

        if (res.changes !== 1) {
            throw new fail.Conflict();
        }
    }

    public setPassword(session: Session, newPassword: string, oldPassword?: string): void {
        const self = session.username === this.username;

        const currentPass = Password.get(this.username);

        if (self) {
            if (!oldPassword) {
                throw new fail.Failure("You must provide your old password to set a new password");
            }

            if (currentPass.expired()) {
                throw new fail.Failure("Your password has expired");
            }

            if (!currentPass.compare(oldPassword)) {
                throw new fail.Failure("Your old password is incorrect");
            }
        } else {
            if (!(session.IsAdmin())) {
                throw new fail.Unauthorized("You must be an admin to set a user's password");
            }
        }

        return currentPass.update(newPassword, session, !self);
    }

    public insert(createdBy: string): void {
        this.validate();
        const res = sql.user.get({ username: this.username });
        if (res.length !== 0) {
            throw new fail.Failure(`A User with the username ${this.username} already exists`);
        }

        sql.user.insert({
            username: this.username,
            admin: this.admin,
            start_date: this.startDate,
            end_date: this.endDate,
            version: this.version,
            created_date: new Date(),
            updated_date: new Date(),
            created_by: createdBy,
            updated_by: createdBy,
        });
    }


    private validate(): void {
        if (this.username.length > maxNameLength) {
            throw new fail.Failure(`username is longer than ${maxNameLength} characters`);
        }

        if (!testUsername.test(this.username)) {
            throw new fail.Failure("username's can only contain letters, numbers and '-' or '_'");
        }
    }
}

