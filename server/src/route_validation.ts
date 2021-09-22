// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import Busboy from "busboy";
import { isValid } from "date-fns";
import * as express from "express";
import { URL } from "url";

import * as fail from "./fail";
import * as uuid from "./uuid";

/*
route(app).post("/v1/model/:id", model.create, [
    param("id").isRequired().isUUID().description("unique identifier for the given model"),
    query("limit").isInt().description("limits the number of records returned"),
    query("offset").isInt().description("offset from the beginning of the list of records"),
    body("userID").isRequired().isUUID().description("id of the user for the model"),
    body("subject").isRequired().isString().description("subject of the model"),
    body("body").isRequired().isString().description("body of the model"),
    body("applicationID").isRequired().isUUID().description("ID of the application for the model"),
]);

*/

interface IField {
    validate(req: express.Request): Promise<void>;
}

interface PromiseHandler {
    (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void>;
}

class Route {
    public fields: IField[] = [];

    constructor(public readonly app: express.Express, public readonly requireSession = true) {}

    public get(path: string, handler: PromiseHandler, ...fields: IField[]) {
        this.fields = fields;
        this.app.get(path, (req: express.Request, res: express.Response, next: express.NextFunction) => {
            this.validate(req)
                .then(async () => {
                    await handler(req, res, next);
                }).catch(next);
        });
    }

    public put(path: string, handler: PromiseHandler, ...fields: IField[]) {
        this.fields = fields;
        this.app.put(path, (req: express.Request, res: express.Response, next: express.NextFunction) => {
            this.validate(req)
                .then(async () => {
                    await handler(req, res, next);
                }).catch(next);
        });
    }

    public post(path: string, handler: PromiseHandler, ...fields: IField[]) {
        this.fields = fields;
        this.app.post(path, (req: express.Request, res: express.Response, next: express.NextFunction) => {
            this.validate(req)
                .then(async () => {
                    await handler(req, res, next);
                }).catch(next);
        });
    }

    public delete(path: string, handler: PromiseHandler, ...fields: IField[]) {
        this.fields = fields;
        this.app.delete(path, (req: express.Request, res: express.Response, next: express.NextFunction) => {
            this.validate(req)
                .then(async () => {
                    await handler(req, res, next);
                }).catch(next);
        });
    }

    private async validate(req: express.Request): Promise<void> {
        if (this.requireSession && !req.session) {
            throw new fail.Unauthorized();
        }
        const promises = [];
        for (const field of this.fields) {
            promises.push(field.validate(req));
        }

        await Promise.all(promises);
    }
}

enum fieldType {
    param = "PARAM",
    query = "QUERY",
    body = "BODY",
}

type validationFunc = (value: unknown, field: string) => unknown;

class Field {
    public fieldDescription?: string;
    private validations: validationFunc[] = [];

    constructor(public readonly type: fieldType, public readonly name: string) {}

    public description(val: string): Field {
        this.fieldDescription = val;
        return this;
    }

    public is(fn: validationFunc): Field {
        this.validations.push(fn);
        return this;
    }

    public validate(req: express.Request): Promise<void> {
        /* eslint @typescript-eslint/no-explicit-any: "off" */
        let value: any;
        if (this.type === fieldType.param) {
            value = req.params;
        } else if (this.type === fieldType.query) {
            value = req.query;
        } else if (this.type === fieldType.body) {
            value = req.body;
        }

        for (const fn of this.validations) {
            const update = fn(value[this.name], this.name);
            if (update !== undefined) {
                value[this.name] = update;
            }
        }

        return Promise.resolve();
    }

    public isFloat(): Field {
        return this.is((value: any, fieldName: string): any => {
            if (value !== undefined) {
                if (value === "" || value === null) {
                    return null;
                }
                const n = parseFloat(value);
                if (n === undefined || isNaN(n)) {
                    throw new fail.Failure(`The field '${fieldName} is not a float`);
                }
                return n;
            }
        });
    }

    public isInt(): Field {
        return this.is((value: any, fieldName: string): any => {
            if (value !== undefined) {
                if (value === "" || value === null) {
                    return null;
                }
                const n = parseInt(value, 10);
                if (n === undefined || isNaN(n)) {
                    throw new fail.Failure(`The field '${fieldName} is not an integer`);
                }
                return n;
            }
        });
    }

    public isBoolean(): Field {
        return this.is((value: any, fieldName: string): any => {
            switch (value) {
                case undefined:
                    return undefined;
                case false:
                case "false":
                case "FALSE":
                case 0:
                case "no":
                case "NO":
                    return false;
                case 1:
                case true:
                case "true":
                case "TRUE":
                case "yes":
                case "YES":
                    return true;
                case null:
                case "":
                case " ":
                    if (this.type === fieldType.query) {
                        // value exists in fields object
                        // example https://myapp.com?unread
                        // unread === true
                        return true;
                    }
                    return false;
            }
            throw new fail.Failure(`The field '${fieldName} is not a boolean`);
        });
    }

    public isOneOf(...values: any[]): Field {
        return this.is((value: any, fieldName: string): any => {
            if (value !== undefined) {
                for (const i of values) {
                    if (value === i) {
                        return;
                    }
                }

                /* eslint @typescript-eslint/restrict-template-expressions: "off" */
                throw new fail.Failure(`The field '${fieldName} is not one of ${values}`);
            }
        });
    }

    public isString(): Field {
        return this.isType("string");
    }

    public matchesRegExp(rx: RegExp, msg: string): Field {
        return this.isType("string").is((value: any) => {
            if (value !== undefined && value !== "" && value !== null) {
                if (!rx.test(value)) {
                    throw new fail.Failure(msg);
                }
            }
        });
    }

    public exists(): Field {
        return this.is((value: any, fieldName: string) => {
            if (value === undefined) {
                throw new fail.Failure(`The field '${fieldName}' must exist`);
            }
        });
    }

    public isRequired(): Field {
        return this.is((value: any, fieldName: string) => {
            if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
                throw new fail.Failure(`The field '${fieldName}' is required`);
            }
        });
    }

    public isUUID(allowNil = true): Field {
        return this.isType("string").is((value: any, fieldName: string) => {
            if (value !== undefined && value !== "" && value !== null && !uuid.isValid(value, allowNil)) {
                throw new fail.Failure(`'${fieldName}' is not a valid UUID`);
            }
        });
    }

    public isDate(): Field {
        return this.is((value: any, fieldName: string) => {
            if (value !== undefined && value !== "" && value !== null && !isValid(new Date(value))) {
                throw new fail.Failure(`The field '${fieldName}' is not a valid date`);
            }
        });
    }

    public isURL(): Field {
        return this.isType("string").is((value: any): any => {
            if (value !== undefined && value !== "" && value !== null) {
                try {
                    return new URL(value).toString();
                } catch (err) {
                    throw new fail.Failure(`Invalid url: ${value}`);
                }
            }
        });
    }

    private isType(type: string): Field {
        return this.is((value: any, fieldName: string) => {
            if (value === null || value === undefined) {
                return;
            }
            if (value !== undefined && typeof value !== type.toLowerCase()) {
                throw new fail.Failure(`The field '${fieldName} is not of type ${type}`);
            }
        });
    }
}

class UploadFile {
    private readonly kb = 1000;
    private readonly mb = this.kb * 1000;
    private readonly gb = this.mb * 1000;

    private fileSize?: number;
    private maxFileCount?: number;
    private minFileCount?: number;
    private regFileName?: RegExp;
    private contentTypes: string[] = [];

    public async validate(req: express.Request): Promise<void> {
        if (!req.get("content-type")) {
            // no file uploaded
            if (this.minFileCount) {
                throw new fail.Failure("You must upload at least one file");
            }
            return;
        }

        let busboy: busboy.Busboy;

        try {
            busboy = new Busboy({
                headers: req.headers,
                limits: {
                    fileSize: this.fileSize,
                    files: this.maxFileCount,
                },
            });
        } catch (err) {
            throw new fail.Failure(`Could not parse file data: ${err}`);
        }

        req.pipe(busboy);
        return new Promise((resolve, reject) => {
            busboy.on("file", (_, stream, filename, encoding, contentType) => {
                if (this.contentTypes.length > 0 && this.contentTypes.indexOf(contentType) === -1) {
                    reject(new fail.Failure(`Content-Type is not one of the following: ${this.contentTypes}`));
                }

                if (this.regFileName && !this.regFileName.test(filename)) {
                    reject(new fail.Failure(`The file name ${filename} is invalid`));
                }

                const chunks: Uint8Array[] = [];
                let limitReached = false;

                stream.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                stream.on("limit", () => {
                    limitReached = true;
                });

                stream.on("end", () => {
                    if ((stream as any).truncated && limitReached) {
                        // file size limit reached
                        reject(new fail.Failure("Upload max size reached", 413)); // request entity too large
                    }

                    if (!req.files) {
                        req.files = [];
                    }

                    req.files.push({
                        filename,
                        data: Buffer.concat(chunks),
                        contentType,
                        encoding,
                    });

                    if (this.minFileCount && req.files.length < this.minFileCount) {
                        if (this.minFileCount === 1) {
                            reject(new fail.Failure("You must upload at least one file"));
                        } else {
                            reject(new fail.Failure(`At least ${this.minFileCount} files need to be uploaded`));
                        }
                    }
                    resolve();
                });
            });

            busboy.on("filesLimit", () => {
                if (this.maxFileCount === 1) {
                    reject(new fail.Failure("Only one file upload is allowed"));
                } else {
                    reject(new fail.Failure(`Only ${this.maxFileCount} files can be uploaded at a time`));
                }
            });
        });
    }

    public isContentType(...types: string[]): UploadFile {
        this.contentTypes.push(...types);
        return this;
    }

    public sizeLimitGB(limit: number): UploadFile {
        this.fileSize = limit * this.gb;
        return this;
    }

    public sizeLimitMB(limit: number): UploadFile {
        this.fileSize = limit * this.mb;
        return this;
    }

    public sizeLimitKB(limit: number): UploadFile {
        this.fileSize = limit * this.kb;
        return this;
    }

    public sizeLimitBytes(limit: number): UploadFile {
        this.fileSize = limit;
        return this;
    }

    public maxFiles(max: number): UploadFile {
        this.maxFileCount = max;
        return this;
    }

    public minFiles(min: number): UploadFile {
        this.minFileCount = min;
        return this;
    }

    public nameMatches(regex: RegExp): UploadFile {
        this.regFileName = regex;
        return this;
    }

    public required(): UploadFile {
        return this.minFiles(1);
    }
}

export function route(app: express.Express, requireSession = true): Route {
    return new Route(app, requireSession);
}

export function param(name: string): Field {
    return new Field(fieldType.param, name);
}

export function query(name: string): Field {
    return new Field(fieldType.query, name);
}

export function body(name: string): Field {
    return new Field(fieldType.body, name);
}

export function files(): UploadFile {
    return new UploadFile();
}

