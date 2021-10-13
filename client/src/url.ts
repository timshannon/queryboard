// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
/* eslint @typescript-eslint/no-explicit-any: 0 */
/* eslint @typescript-eslint/no-unsafe-call: 0 */

export function fromQuery(qry = window.location.search.substring(1)): any {
    const queryObject: any = {};

    const vars = qry.split("&");
    for (const item of vars) {
        const pair = item.split("=");
        // If first entry with this name
        if (typeof queryObject[pair[0]] === "undefined") {
            queryObject[pair[0]] = decodeURIComponent(pair[1]);
            // If second entry with this name
        } else if (typeof queryObject[pair[0]] === "string") {
            const arr = [queryObject[pair[0]], decodeURIComponent(pair[1])];
            queryObject[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            queryObject[pair[0]].push(decodeURIComponent(pair[1]));
        }
    }

    return queryObject;
}

export function toQuery(obj: any): string {
    let str = "?";
    for (const i in obj) {
        if (i !== "toString") {
            if (obj[i] === null || obj[i] === undefined || obj[i] === "undefined") {
                str += i + "&";
            } else if (typeof obj[i] === "string" || typeof obj[i] === "number") {
                str += i + "=" + encodeURIComponent(obj[i]) + "&";
            } else if (typeof obj[i] === "boolean") {
                if (obj[i]) {
                    str += i + "&";
                }
            } else {
                // array
                for (const j in obj[i]) {
                    str += i + "=" + encodeURIComponent(obj[i][j]) + "&";
                }
            }
        }
    }
    return str.slice(0, -1);
}

export function join(...args: string[]): string {
    const j = [].slice.call(args, 0).join("/");

    return j.replace(/[/]+/g, "/")
        .replace(/\/\?/g, "?")
        .replace(/\/#/g, "#")
        .replace(/:\//g, "://");
}

