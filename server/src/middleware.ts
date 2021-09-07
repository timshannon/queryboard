// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as fail from "./fail";
import log from "./log";
import * as uuid from "./uuid";

import * as express from "express";

export interface ISession {
    id: string;
    userID: uuid.ID;
    csrfToken: string;
    expires: Date;
    actions(): Promise<string[]>;
}


interface IUpload {
    filename: string;
    contentType: string;
    encoding: string;
    data: Buffer;
}

declare global {
    namespace Express {
        /* tslint:disable:interface-name */
        interface Request {
            session?: ISession;
            files?: IUpload[];
        }
    }
}

// TODO: Session handling middleware
// type sessionFunc = (token: string, signed: boolean) => Promise<ISession | null>;

// export function session(getSessionFunc: sessionFunc = getSession) {
//     // usually only the security service will be using it's own getSession func to get the session directly
//     // from the database. Everyone else will use the default get session which will make a call to the security
//     // service's REST API
//     return async (req: express.Request, _: express.Response, next: express.NextFunction) => {
//         try {
//             let token = "";
//             let signed = false;

//             const header = req.header("Authorization");
//             if (header) {
//                 token = header.slice("Bearer ".length);
//             } else {
//                 // get signed auth from query params
//                 signed = true;
//                 token = req.query.authorization;
//             }

//             if (token) {
//                 const s = await getSessionFunc(token, signed);
//                 if (s) {
//                     req.session = s;
//                 }
//             }
//         } catch (err) {
//             return next(err);
//         }
//         return next();
//     };
// }

export function errors(err: Error, req: express.Request, res: express.Response, _: express.NextFunction) {
    if (err instanceof fail.Failure) {
        log.warning(err);
        res.status(err.status).send({ message: err.message });
        return;
    }
    if (err instanceof SyntaxError) {
        log.warning(err);
        res.status(400).send({ message: err.message });
        return;
    }

    log.error(err);

    if (process.env.NODE_ENV !== "production") {
        res.status(500).send({ message: err.message, stack: err.stack });
        return;
    }

    res.status(500).send({ message: "An internal server error has occurred" });
    return;
}

// should always be lowercase https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
export const CSRFHeader = "x-csrftoken";

// handles csrf token handling with the session, must come after session is set
export function csrf(req: express.Request, res: express.Response, next: express.NextFunction) {
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

