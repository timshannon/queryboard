// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { sysdb } from "../data/data";
import { Session } from "./session";
import { Password } from "./password";
import sql from "./user_sql";
import * as fail from "../fail";

import { isAfter, isBefore } from "date-fns";

const maxNameLength = 500;

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
    public static async create(session: Session, username: string, tempPassword: string): Promise<User> {
        var who = await session.user();
        if (!who.admin) {
            throw new fail.Unauthorized("Only admins can create new users");
        }

        const newUser = new User({
            username,
            version: 0,
            startDate: new Date(),
        });

        const pwd = await Password.create(username, tempPassword, who);

        await sysdb.beginTran(async () => {
            await newUser.insert(who.username);
            await pwd.insert();
        });
        return newUser;
    }

    public static async get(session: Session, username: string): Promise<User> {
        if (session.username !== username && !(await session.IsAdmin())) {
            throw new fail.Unauthorized("Only admins can view other user records");
        }

        const res = await sql.user.get({ $username: username });

        if (res.length === 0) {
            throw new fail.NotFound();
        }

        return User.fromRow(res[0]);
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

    public async update(session: Session, updates: IUpdates): Promise<void> {
        if (updates.startDate) {
            if (!(await session.IsAdmin())) {
                throw new fail.Unauthorized("Only admins can update a user's start date");
            }
            this.startDate = updates.startDate;
        }

        if (updates.endDate) {
            if (!(await session.IsAdmin())) {
                throw new fail.Unauthorized("Only admins can update a user's end date");
            }
            this.endDate = updates.endDate;
        }

        await this.validate();

        const res = await sql.user.update({
            $username: this.username,
            $version: updates.version,
            $admin: this.admin,
            $start_date: this.startDate,
            $end_date: this.endDate,
            $updated_date: new Date(),
            $updated_by: session.username,
        });

        if (res.changes !== 1) {
            throw new fail.Conflict();
        }
    }

    public async setPassword(session: Session, newPassword: string, oldPassword?: string): Promise<void> {
        const self = session.username === this.username;

        const currentPass = await Password.get(this.username);

        if (self) {
            if (!oldPassword) {
                throw new fail.Failure("You must provide your old password to set a new password");
            }

            if (!await currentPass.compare(oldPassword!)) {
                throw new fail.Failure("Your old password is incorrect");
            }
        } else {
            if (!(await session.IsAdmin())) {
                throw new fail.Unauthorized("You must be an admin to set a user's password");
            }
            // TODO: expire password if set by admin
        }

        return currentPass.update(newPassword, session);
    }

    public async insert(createdBy: string): Promise<void> {
        await this.validate();
        const res = await sql.user.get({ $username: this.username });
        if (res.length !== 0) {
            throw new fail.Failure(`A User with the username ${this.username} already exists`);
        }

        await sql.user.insert({
            $username: this.username,
            $admin: this.admin,
            $start_date: this.startDate,
            $end_date: this.endDate,
            $version: this.version,
            $created_date: new Date(),
            $updated_date: new Date(),
            $created_by: createdBy,
            $updated_by: createdBy,
        })
    }


    private async validate(): Promise<void> {
        if (this.username.length > maxNameLength) {
            throw new fail.Failure(`username is longer than ${maxNameLength} characters`);
        }
    }
}

