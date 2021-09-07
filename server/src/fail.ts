// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

// Failure is an error that is visible to a client, and comes with an associated HTTP status code
export class Failure extends Error {
    constructor(readonly message: string, readonly status: number = 400) {
        super(message);
        Object.setPrototypeOf(this, Failure.prototype);
    }
}

// Unauthorized is when a user doesn't have access to something
export class Unauthorized extends Failure {
    constructor(readonly message: string = "Unauthorized") {
        super(message, 401);
        Object.setPrototypeOf(this, Unauthorized.prototype);
    }
}

// NotFound is returned when the specific item requested does not exist
export class NotFound extends Failure {
    constructor(readonly message: string = "Not Found") {
        super(message, 404);
        Object.setPrototypeOf(this, NotFound.prototype);
    }
}

// Conflict is the error retured when a record is being updated, but it's not the most current version
// of the record (409)
export class Conflict extends Failure {
    constructor(readonly message: string = "You are not updating the most recent version of the record") {
        super(message, 409);
        Object.setPrototypeOf(this, NotFound.prototype);
    }
}

