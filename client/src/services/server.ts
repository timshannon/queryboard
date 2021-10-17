// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import config from "../config";

import { Client } from "../http";

const client = new Client(config.server);

export interface IUser {
    username: string;
    version: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
    createdDate: Date;
    updatedBy: string;
    updatedDate: Date;
}

interface ISession {
    id: string;
    userID: string;
    csrfToken: string;
    expires: Date;
}

export default {
    login: async (username: string, password: string, rememberMe: boolean): Promise<ISession> => {
        const res = await client.post<ISession>("/v1/sessions/password", {
            username,
            password,
            rememberMe,
        });

        if (!res.response) {
            throw new Error("Invalid session");
        }

        client.setSession(res.response.id, rememberMe ? new Date(res.response.expires) : undefined);

        return res.response;
    },
    user: {
        get: async (username: string): Promise<IUser> => {
            const res = await client.get<IUser>(`/v1/users/${username}`);
            return res.response;
        },
    },
};

