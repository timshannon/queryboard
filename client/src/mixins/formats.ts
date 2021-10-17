// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

export default {
    filters: {
        dateShort: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleDateString();
        },
        dateStandard: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        },
        dateLong: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        },
        dateTime: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleDateString(undefined,
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                },
            );
        },
        longDateTime: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleDateString(undefined,
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                },
            );
        },
        time: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleTimeString();
        },
        dateCustom: (value: Date, format: Intl.DateTimeFormatOptions): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleDateString(undefined, format);
        },
        timeCustom: (value: Date, format: Intl.DateTimeFormatOptions): string => {
            if (!value || !(value instanceof Date)) { return ""; }
            return value.toLocaleTimeString(undefined, format);
        },
        since: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }

            let postfix = "ago";
            let seconds = Math.floor((Date.now() - value.valueOf()) / 1000);

            if (seconds < 0) {
                postfix = "from now";
                seconds *= -1;
            }

            let interval = Math.floor(seconds / 31536000);

            if (interval > 1) {
                return interval.toString() + " years " + postfix;
            }
            interval = Math.floor(seconds / 2592000);
            if (interval > 1) {
                return interval.toString() + " months " + postfix;
            }
            interval = Math.floor(seconds / 86400);
            if (interval > 1) {
                return interval.toString() + " days " + postfix;
            }
            interval = Math.floor(seconds / 3600);
            if (interval > 1) {
                return interval.toString() + " hours " + postfix;
            }
            interval = Math.floor(seconds / 60);
            if (interval > 1) {
                return interval.toString() + " minutes " + postfix;
            }

            interval = Math.floor(seconds);

            if (interval > 1) {
                return interval.toString() + " seconds " + postfix;
            }
            return "1 second " + postfix;
        },
        dateMinimal: (value: Date): string => {
            if (!value || !(value instanceof Date)) { return ""; }

            const now = new Date();

            if (now.getFullYear() !== value.getFullYear()) {
                return value.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            }

            if (now.getDate() !== value.getDate()) {
                return value.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                });
            }

            return value.toLocaleTimeString();
        },
        currency: (value: number): string => {
            if (typeof value !== "number") { return ""; }
            // programming is just copy/pasting from stack overflow...
            // assumes US currency format for now
            return `$${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
        },
        percent: (value: number, decimals = 0): string => {
            if (typeof value !== "number") { return ""; }
            return `${(value * 100).toFixed(decimals)}%`;
        },
    },
};

