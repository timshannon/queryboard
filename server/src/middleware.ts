// Copyright 2021-present Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import {Session} from "./models/session";
import * as fail from "./fail";
import log from "./log";

import * as express from "express";


interface IUpload {
    filename: string;
    contentType: string;
    encoding: string;
    data: Buffer;
}

// queryboard specific request data
declare global {
    /* eslint @typescript-eslint/no-namespace: "off" */
    namespace Express {
        interface Request {
            session?: Session;
            files?: IUpload[];
        }
    }
}

// TODO: Session handling middleware
export function session() {
    return (req: express.Request, _: express.Response, next: express.NextFunction): void => {
        try {
            let token = "";

            const header = req.header("Authorization");
            if (header) {
                token = header.slice("Bearer ".length);
            }

            if (token) {
                const s = Session.get(token);
                if (s) {
                    req.session = s;
                }
            }
        } catch (err) {
            return next(err);
        }
        return next();
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errors(err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction): void {
    if (err instanceof fail.Failure) {
        log.warning(err);
        res.status(err.status).send({message: err.message});
        return;
    }
    if (err instanceof SyntaxError) {
        log.warning(err);
        res.status(400).send({message: err.message});
        return;
    }

    log.error(err);

    if (process.env.NODE_ENV !== "production") {
        res.status(500).send({message: err.message, stack: err.stack});
        return;
    }

    res.status(500).send({message: "An internal server error has occurred"});
    return;
}

// should always be lowercase https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
export const CSRFHeader = "x-csrftoken";

// handles csrf token handling with the session, must come after session is set
export function csrf(req: express.Request, res: express.Response, next: express.NextFunction): void {
    res.setHeader("Access-Control-Expose-Headers", CSRFHeader);
    if (!req.session) {
        return next();
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        // validate csrf token
        if (req.get(CSRFHeader) !== req.session.csrfToken) {
            return next(new fail.Failure("Invalid CSRFToken.  Please refresh and try again"));
        }
        return next();
    }

    // set CSRF token header on GET calls
    res.setHeader(CSRFHeader, req.session.csrfToken);
    return next();
}

// TODO: Rate limiting middleware? 

