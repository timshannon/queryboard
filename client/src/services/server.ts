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

export default {
    user: {
        get: async (username: string): Promise<IUser> => {
            const res = await client.get<IUser>(`/v1/users/${username}`);
            return res.response!;
        },
    },
};

