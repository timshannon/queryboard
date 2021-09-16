// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { sysdb } from "../data/data";
import { Password } from "./password";
import sql from "./user_sql";
import * as fail from "../fail";

import { addMinutes, isAfter, isBefore } from "date-fns";

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
    admin: boolean;
    startDate?: Date;
    endDate?: Date;
}

export class User {
    public static async create(who: User, username: string, tempPassword: string): Promise<User> {
        if (!who.admin) {
            throw new fail.Unauthorized("Only admins can create new users");
        }

        const newUser = new User({
            username,
            version: 0,
            startDate: new Date(),
        });

        const pwd = await Password.create(newUser.id, password, reg.createdBy);

        await sysdb.beginTran(async () => {
            await newUser.insert(who.username);
            await pwd.insert();
        });
        return newUser;
    }

    public static async createInternal(session: security.ISession, email: string, password: string,
        fullName?: string): Promise<User> {
        await session.tryAction(action.ADD); // TODO: should there be a different action for this?
        const newUser = new User({
            id: uuid.generate(),
            version: 0,
            email,
            startDate: new Date(),
            fullName,
        });
        await newUser.validate();

        await pool.beginTran(async (tx) => {
            await newUser.insert(session.userID, tx);
            await security.registerInternalAuthentication(tx, email, password);
        });
        return newUser;
    }

    public static async get(session: security.ISession, id: uuid.ID, cnn: data.IConnection = pool): Promise<User> {
        if (session.userID !== id) {
            await session.tryAction(action.VIEW);
        }

        uuid.validate(id);

        const res = await cnn.query(sql.user.get, id);
        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }

        return User.fromRow(res.rows[0]);
    }

    public static async search(session: security.ISession, search: string, limit: number = 100,
        offset: number = 0, order?: string): Promise<data.IPage<User>> {
        await session.tryAction(action.VIEW);

        order = order || "full_name:asc";
        const res = await pool.query(data.statement(sql.user.search, `%${search.toLocaleLowerCase()}%`)
            .paged(limit, offset).orderBy(order).columns(
                "user_id",
                "email",
                "email_search",
                "full_name",
                "start_date",
                "end_date",
                "image_token",
                "updated_date",
                "created_date",
                "created_by",
                "updated_by",
            ));
        const users: User[] = [];

        for (const row of res.rows) {
            users.push(User.fromRow(row));
        }

        return {
            total: res.total,
            page: res.page,
            pages: res.pages,
            data: users,
        };
    }

    public static async updateEmail(session: security.ISession, email: string): Promise<void> {
        validation.isEmail(email);
        const res = await pool.query(sql.user.getByEmail, email.toLowerCase());
        if (res.rowCount !== 0) {
            if (res.rows[0].user_id === session.userID) {
                throw new fail.Failure("This email address matches the current address");
            }
            throw new fail.Failure(`A User with the email ${email} already exists`);
        }

        await pool.beginTran(async (tx: data.Transaction) => {
            const token = data.random(256);
            const expires = addMinutes(new Date(), emailChangeExpirationMinutes);
            await tx.query(sql.email.insert, token, email, session.userID, expires, new Date(), session.userID);
            await svcEmail.send(email, "Confirm your email address", emailTemplate.baseTemplate.template(`
                <h1 align="center">Please confirm your email address</h1>
                <br>
                <p>A request was made to change your email address.  Please click below to confirm the email address
                change.  The link is only valid for the next ${emailChangeExpirationMinutes} minutes.</p>
                <p>If you did NOT request this change, you can safely ignore this email.</p>
                <br>
                ${emailTemplate.baseTemplate.button("Click Here To Confirm your Email Address",
                url.resolve(config.common.baseURL, "email/" + token))}`));
        });
    }

    public static async claimEmailUpdate(token: string): Promise<void> {
        await pool.beginTran(async (tx: data.Transaction) => {
            let res = await tx.query(sql.email.get, token, new Date());
            if (res.rowCount === 0) {
                throw new fail.NotFound("Invalid email change token");
            }

            const row = res.rows[0];

            res = await pool.query(sql.user.getByEmail, row.new_email.toLowerCase());
            if (res.rowCount !== 0) {
                if (res.rows[0].user_id !== row.user_id) {
                    throw new fail.Failure(`A User with the email ${row.new_email} already exists`);
                }
            }

            await tx.query(sql.email.claim, new Date(), token);
            await tx.query(sql.user.updateEmail, row.user_id, row.new_email, row.new_email.toLowerCase());
        });
    }

    public static fromRow(row: any): User {
        return new User({
            id: row.user_id,
            version: row.version,
            email: row.email,
            startDate: row.start_date,
            endDate: row.end_date,
            fullName: row.full_name,
            imageToken: row.image_token,
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

    public async addAction(session: security.ISession, act: Action, cnn: data.IConnection = pool): Promise<void> {
        await session.tryAction(action.EDIT_ACTIONS);
        if (!act.active) {
            throw new fail.Failure("Can't add an inactive action");
        }

        const res = await cnn.query(sql.actions.get, this.id, act.value);

        if (res.rowCount !== 0) {
            // action already added
            return;
        }

        await cnn.query(sql.actions.add, this.id, act.value, session.userID, new Date());
    }

    public async removeAction(session: security.ISession, act: Action, cnn: data.IConnection = pool): Promise<void> {
        await session.tryAction(action.EDIT_ACTIONS);
        // currently will not fail if they try to remove an action that the user doesn't have
        await cnn.query(sql.actions.remove, this.id, act.value);
    }

    public async actions(session: security.ISession, effective: boolean, order?: string): Promise<Action[]> {
        await session.tryAction(actions.VIEW);
        order = order || "action:asc";
        const qry = effective ? sql.actions.effective : sql.actions.list;

        const res = await pool.query(data.statement(qry, this.id).orderBy(order)
            .columns("action", "description", "active", "created_date"));
        const acts: Action[] = [];
        for (const row of res.rows) {
            acts.push(Action.fromRow(row));
        }

        return acts;
    }

    public async update(session: security.ISession, updates: IUpdates, cnn: data.IConnection = pool): Promise<void> {
        const self = session.userID === this.id;

        if (updates.fullName) {
            if (!self) {
                await session.tryAction(action.SET_NAME);
            }

            this.fullName = updates.fullName;
        }

        if (updates.startDate) {
            await session.tryAction(action.SET_START);
            this.startDate = updates.startDate;
        }

        if (updates.endDate) {
            await session.tryAction(action.SET_END);
            this.endDate = updates.endDate;
        }

        await this.validate();

        const res = await cnn.query(sql.user.update, this.id, updates.version, this.fullName, this.startDate,
            this.endDate, new Date(), session.userID);

        if (res.rowCount !== 1) {
            throw new fail.Conflict();
        }
    }

    public async setPassword(session: security.ISession, newPassword: string, oldPassword?: string): Promise<void> {
        const self = session.userID === this.id;

        const currentPass = await Password.get(this.id);

        if (self) {
            if (!oldPassword) {
                throw new fail.Failure("You must provide your old password to set a new password");
            }

            if (currentPass.expired()) {
                throw new fail.Failure("Your password has expired");
            }

            if (!await currentPass.compare(oldPassword!)) {
                throw new fail.Failure("Your old password is incorrect");
            }
        } else {
            await session.tryAction(action.SET_PASSWORD);
        }

        return pool.beginTran((tx): Promise<void> => {
            return currentPass.update(newPassword, session.userID, session, tx);
        });
    }

    public async insert(createdBy: string, cnn: data.IConnection = pool): Promise<pg.QueryResult> {
        await this.validate();
        const res = await cnn.query(sql.user.getByEmail, this.email.toLowerCase());
        if (res.rowCount !== 0) {
            throw new fail.Failure(`A User with the email ${this.email} already exists`);
        }
        return cnn.query(sql.user.insert, this.id, this.email, this.email.toLowerCase(), this.fullName,
            this.startDate, this.endDate, this.version, new Date(), new Date(), createdBy, createdBy);
    }

    public async addProfileImageDraft(session: security.ISession, image: Buffer, contentType: string): Promise<void> {
        if (session.userID !== this.id) {
            throw new fail.Unauthorized();
        }

        if (validImageTypes.indexOf(contentType) === -1) {
            throw new fail.Failure(`${contentType} is not a valid image type`);
        }

        let img = sharp(image);

        // make sure image is within the max image size
        const imgMeta = await img.metadata();
        if ((imgMeta.height && imgMeta.height > maxDraftImageSize) ||
            (imgMeta.width && imgMeta.width > maxDraftImageSize)) {
            img = img.resize(maxDraftImageSize, maxDraftImageSize, {
                fit: "outside",
            });
        }

        if (imgMeta.orientation) {
            // rotate image based on exif info (useful for images from phones
            img = img.rotate(); // no parm defaults to exif rotation
        }

        image = await img.toBuffer();

        await pool.query(sql.user.setImageDraft, this.id, image, contentType);
    }

    public async setProfileImageFromDraft(session: security.ISession, version: number, left: number, top: number,
        size: number): Promise<void> {
        if (session.userID !== this.id) {
            throw new fail.Unauthorized();
        }

        if (size <= 0) {
            throw new fail.Failure("Size must be greater than 0");
        }

        let image: Buffer;
        try {
            image = (await this.getImageDraft(session)).data;
        } catch (err) {
            if (err.status && err.status === 404) {
                throw new fail.Failure("No draft image found.  You must upload a draft image first");
            }
            throw err;
        }

        // profile images are square so width === height
        const img = sharp(image).extract({ left, top, width: size, height: size }).resize(profileImageSize);

        image = await img.toBuffer();
        const icon = await img.resize(profileIconSize).toBuffer();
        const token = data.random(256);

        const res = await pool.query(sql.user.setImage, this.id, version, image, icon, token, new Date(),
            session.userID);

        if (res.rowCount !== 1) {
            throw new fail.Conflict();
        }
    }

    public async removeProfileImage(session: security.ISession, version: number): Promise<void> {
        if (session.userID !== this.id) {
            throw new fail.Unauthorized();
        }

        const res = await pool.query(sql.user.setImage, this.id, version, null, null, "", new Date(), session.userID);

        if (res.rowCount !== 1) {
            throw new fail.Conflict();
        }
    }

    public async getImageDraft(session: security.ISession): Promise<IImage> {
        return this.PublicUser().getImageDraft(session);
    }

    public PublicUser(): PublicUser {
        return new PublicUser(this.id, this.email, this.fullName, this.imageToken);
    }

    public async groups(session: security.ISession, order?: string): Promise<Group[]> {
        await session.tryAction(groups.VIEW);
        order = order || "name:asc";

        const res = await pool.query(data.statement(sql.user.groups, this.id).orderBy(order)
            .columns("name", "description", "active", "created_date"));
        const grps: Group[] = [];

        for (const row of res.rows) {
            grps.push(Group.fromRow(row));
        }

        return grps;
    }

    private async validate(): Promise<void> {
        uuid.validate(this.id);

        if (!this.email) {
            throw new fail.Failure("Email not set on user");
        }

        validation.isEmail(this.email);

        if (this.fullName && this.fullName.length > maxNameLength) {
            throw new fail.Failure(`Name is longer than ${maxNameLength} characters`);
        }
    }
}

// Public user is a User with only the publicly available information, and doesn't require the svc-security:user:view
// action
export class PublicUser {
    public static async get(session: security.ISession, id: uuid.ID,
        cnn: data.IConnection = pool): Promise<PublicUser> {
        if (!session) {
            throw new fail.Unauthorized();
        }
        uuid.validate(id);

        const res = await cnn.query(sql.user.get, id);
        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }

        return PublicUser.fromRow(res.rows[0]);
    }

    public static async getImage(id: uuid.ID, token: string): Promise<IImage> {
        if (!token) {
            throw new fail.NotFound();
        }

        const res = await pool.query(sql.user.getImage, id, token);
        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }
        if (!res.rows[0].image) {
            throw new fail.NotFound();
        }

        return {
            data: res.rows[0].image,
            contentType: res.rows[0].image_type,
        };
    }

    public static async getIcon(id: uuid.ID, token: string): Promise<IImage> {
        if (!token) {
            throw new fail.NotFound();
        }
        const res = await pool.query(sql.user.getIcon, id, token);
        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }
        if (!res.rows[0].icon) {
            throw new fail.NotFound();
        }
        return {
            data: res.rows[0].icon,
            contentType: res.rows[0].image_type,
        };
    }

    public static fromRow(row: any): PublicUser {
        return new PublicUser(
            row.user_id,
            row.email,
            row.full_name,
            row.image_token,
        );
    }

    public preventDuckTyping: never; // this field exists to make sure User can never be passed in as a PublicUser

    constructor(public readonly id: uuid.ID,
        public email: string,
        public fullName?: string,
        public imageToken?: string) {}

    public async getImageDraft(session: security.ISession): Promise<IImage> {
        if (!session) {
            throw new fail.Unauthorized();
        }

        const res = await pool.query(sql.user.getImageDraft, this.id);
        if (res.rowCount === 0) {
            throw new fail.NotFound();
        }

        if (!res.rows[0].image_draft) {
            throw new fail.NotFound();
        }

        return {
            data: res.rows[0].image_draft,
            contentType: res.rows[0].image_draft_type,
        };
    }
}

// export class Registration {
    // public static async create(session: security.ISession, email: string, expireDays?: number,
    //     fullName?: string): Promise<Registration> {
    //     await session.tryAction(action.ADD);
    //     if (expireDays === undefined) {
    //         expireDays = await settings.userRegistration.expirationDays.get();
    //     }

    //     const expires = addDays(new Date(), expireDays);
    //     const reg = new Registration(data.random(256), email, session.userID, undefined, expires, fullName);
    //     await pool.beginTran(async (tx: data.Transaction) => {
    //         await reg.insert(tx);
    //         await svcEmail.send(email, "Welcome to Laurentian Solutions", emailTemplate.baseTemplate.template(`
    //             <h1 align="center">Welcome to Laurentian Solutions</h1>
    //             <br>
    //             ${emailTemplate.baseTemplate.button("Click Here To Setup Your Account",
    //             url.resolve(config.common.baseURL, "registration/" + reg.id))}`)); // TODO: share url w/ ui-portal?
    //     });
    //     return reg;
    // }

    // public static async get(id: string): Promise<Registration> {
    //     const res = await pool.query(sql.registration.get, id, new Date());

    //     if (res.rowCount === 0) {
    //         throw new fail.NotFound("Invalid User Registration ID");
    //     }

    //     const row = res.rows[0];

    //     return new Registration(row.registration_id, row.email, row.created_by, undefined, row.expires, row.full_name);
    // }

    // constructor(public readonly id: string,
    //     public readonly email: string,
    //     public readonly createdBy: uuid.ID,
    //     public readonly claimed?: Date,
    //     public readonly expires?: Date,
    //     public readonly fullName?: string,
    // ) {}

    // public claim(cnn: data.IConnection = pool, theDate = new Date()): Promise<pg.QueryResult> {
    //     if (this.claimed) {
    //         throw new fail.Failure("Registration has already been used");
    //     }
    //     return cnn.query(sql.registration.claim, theDate, this.id);
    // }

    // private insert(cnn: data.IConnection = pool): Promise<pg.QueryResult> {
    //     if (!this.email) {
    //         throw new fail.Failure("Email not set in registration");
    //     }

    //     validation.isEmail(this.email);

    //     return cnn.query(sql.registration.insert, this.id, this.email, this.fullName, this.expires, new Date(),
    //         this.createdBy);
    // }
// }

