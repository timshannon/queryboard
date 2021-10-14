// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import { join, toQuery } from "./url";

const CSRFHeader = "x-csrftoken";

const csrfKey = "QueryBoardCSRFToken";
const sessionIDKey = "QueryBoardSessionID";
const sessionExpirationKey = "QueryBoardSessionExpires";

export interface Result<T> {
    request: XMLHttpRequest;
    response?: T;
}

export interface Page<T> {
    total: number;
    page: number;
    pages: number;
    data: T[];
}

export class HttpError extends Error {
    constructor(readonly message: string, readonly request: XMLHttpRequest, readonly response?: unknown) {
        super(message);
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

type errorHandler = ((err: HttpError) => void) | null;

const errorHandlers: errorHandler[] = [];

export const onError = {
    add(handler: errorHandler): number {
        errorHandlers.push(handler);
        return errorHandlers.length - 1;
    },
    // id is number returned from add call
    remove(id: number): void {
        errorHandlers[id] = null;
    },
};

function notifyErrorHandlers(err: HttpError): void {
    for (const h of errorHandlers) {
        if (h) {
            h(err);
        }
    }
}

const isoDateFormat = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

export function parseJSON<T>(val: string): T {
    return JSON.parse(val, (_: unknown, value: unknown) => {
        if (typeof value === "string" && isoDateFormat.test(value)) {
            return new Date(value);
        }

        return value;
    }) as T;
}



function getSession(): [string | null, Date | null] {
    let sessionID: string | null;
    let sessionExpiration: Date | null;

    const expires = localStorage.getItem(sessionExpirationKey);

    if (expires) {
        sessionExpiration = new Date(expires);

        if (sessionExpiration && sessionExpiration > new Date()) {
            sessionID = localStorage.getItem(sessionIDKey);
            return [sessionID, sessionExpiration];
        }
    }

    sessionExpiration = null;
    sessionID = sessionStorage.getItem(sessionIDKey);
    return [sessionID, sessionExpiration];
}

export function hasSession(): boolean {
    const session = getSession();
    return session[0] !== undefined && session[0] !== null;
}


export class Socket {
    public onmessage: ((ev: MessageEvent) => unknown) | null = null;
    public connection?: WebSocket;
    private manualClose = false;

    constructor(private readonly client: Client, private readonly path: string,
        public retryPollDuration: number = 5000) {}

    public socketAddress(): string {
        return join(this.client.baseURL, this.path).replace("http://", "ws://").replace("https://", "wss://");
    }


    public async connect(): Promise<void> {
        this.connection = await this.createConnection();
    }

    private async createConnection(): Promise<WebSocket> {
        let url = this.socketAddress();

        if (hasSession()) {
            url = await this.client.signedURL(url);
        }

        return new Promise((resolve, reject) => {
            const connection = new WebSocket(url);
            connection.onopen = (): void => {
                this.manualClose = false;
                // this.connection!.onmessage = this.onmessage;
                connection.onmessage = (ev: MessageEvent) => {
                    if (this.onmessage) {
                        this.onmessage(ev);
                    }
                };
                connection.onerror = (event): void => {
                    // eslint-disable-next-line no-console
                    console.log("Web Socket error, retrying: ", event);
                    this.retry();
                };
                // will always retry closed connections until a message is sent from the server to
                // for the client to close the connection themselves.
                connection.onclose = (): void => {
                    if (this.manualClose) {
                        return;
                    }
                    this.retry();
                };
                resolve(connection);
            };

            connection.onerror = (): void => {
                reject(new Error(`Error connecting websocket to ${this.socketAddress()}`));
            };

        });
    }

    public async send(data: unknown): Promise<void> {
        if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
            this.connection = await this.createConnection();
        }

        let msg: string | ArrayBufferLike | Blob | ArrayBufferView;
        if (typeof data === "string" || data instanceof ArrayBuffer || data instanceof Blob) {
            msg = data;
        } else {
            msg = JSON.stringify(data);
        }

        this.connection.send(msg);
    }

    public close(code?: number, reason?: string): void {
        if (this.connection) {
            this.manualClose = true;
            this.connection.close(code, reason);
        }
    }

    private retry(): void {
        setTimeout(() => {
            this.connect()
                .catch((err) => {
                    console.log("Web Socket Errored, retrying: ", err);
                    this.retry();
                });
        }, this.retryPollDuration);
    }
}



type progressFunc = (this: XMLHttpRequestUpload, evt: ProgressEvent) => unknown;

export class Client {
    public sessionID: string | null = null;
    public sessionExpiration: Date | null = null;

    constructor(public readonly baseURL: string,
        public readonly headers?: Record<string, string>) {
        this.loadSession();
    }

    public async send<T>(method: string, url: string, data?: unknown, progress?: progressFunc): Promise<Result<T>> {
        if (method.toLowerCase() !== "get") {
            if (hasSession() && !this.csrfToken) {
                await this.refreshCSRFToken();
            }
        }

        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();

            request.open(method, url, true);

            request.onload = (): void => {
                const result: Result<T> = {
                    request, // original xhr request
                };

                let response: string | T | { message: string } | undefined;

                const token = request.getResponseHeader(CSRFHeader);
                if (token) {
                    this.csrfToken = token;
                }

                if (request.responseText) {
                    const contentType = request.getResponseHeader("Content-Type");
                    if (contentType && contentType.toLowerCase() === "text/html") {
                        response = request.responseText;
                    } else {
                        try {
                            response = parseJSON(request.responseText);
                        } catch (e) {
                            if (e instanceof Error) {
                                const parseErr = new HttpError(`Error parsing result: ${request.responseText}: ${e.message}`,
                                    request, request.responseText);
                                notifyErrorHandlers(parseErr);
                                return reject(parseErr);
                            }
                        }
                    }
                }

                if (request.status >= 200 && request.status < 400) {
                    if (response) {
                        result.response = response as T;
                    }
                    return resolve(result);
                }

                if (response && typeof response == "object" && ("message" in response)) {
                    const err = new HttpError(response.message, request, result.response);
                    notifyErrorHandlers(err);
                    return reject(err);
                }
                const unknownErr = new HttpError(response as string, request, result.response);
                notifyErrorHandlers(unknownErr);
                return reject(unknownErr);
            };

            request.onerror = (error): void => {
                const reqError = new HttpError("An error occurred transmitting the request", request, error);
                // There was a connection error of some sort
                notifyErrorHandlers(reqError);
                reject(reqError);
            };

            if (progress) {
                request.upload.addEventListener("progress", progress, false);
            }

            if (this.headers) {
                for (const name in this.headers) {
                    request.setRequestHeader(name, this.headers[name]);
                }
            }

            request.setRequestHeader("Accept", "application/json, text/plain");
            if (!this.sessionID) {
                // check if a session exists yet
                this.loadSession();
            }

            if (this.sessionID) {
                if (!this.sessionExpiration || this.sessionExpiration > new Date()) {
                    request.setRequestHeader("Authorization", `Bearer ${this.sessionID}`);
                }
            }

            if (method.toLowerCase() !== "get" && this.csrfToken) {
                request.setRequestHeader(CSRFHeader, this.csrfToken);
            }

            if (data instanceof FormData) {
                return request.send(data);
            }
            if (data instanceof File) {
                const form = new FormData();
                form.append(data.name, data, data.name);

                return request.send(form);
            }
            if (typeof data === "object") {
                request.setRequestHeader("Content-Type", "application/json");
                return request.send(JSON.stringify(data));
            }
            request.send();
        });
    }

    public get csrfToken(): string {
        return sessionStorage.getItem(csrfKey) || "";
    }

    public set csrfToken(token: string) {
        sessionStorage.setItem(csrfKey, token);
    }

    public get<T>(path: string, params?: unknown): Promise<Result<T>> {
        return this.send("GET", join(this.baseURL, encodeURI(path) + toQuery(params)));
    }

    public put<T>(path: string, data?: unknown, progress?: progressFunc): Promise<Result<T>> {
        return this.send("PUT", encodeURI(join(this.baseURL, path)), data, progress);
    }

    public post<T>(path: string, data?: unknown, progress?: progressFunc): Promise<Result<T>> {
        return this.send("POST", encodeURI(join(this.baseURL, path)), data, progress);
    }

    public delete<T>(path: string, data?: unknown, progress?: progressFunc): Promise<Result<T>> {
        return this.send("DELETE", encodeURI(join(this.baseURL, path)), data, progress);
    }

    public socket(path: string, retryPoll = 5000): Socket {
        if (!this.sessionID) {
            // check if a session exists yet
            this.loadSession();
        }

        return new Socket(this, path, retryPoll);
    }

    // setSession stores the session ID in localStorage along with the date the session expires
    // if no expiration date is set, the session is stored in sessionStorage
    public setSession(sessionID: string, expires?: Date): void {
        this.sessionID = sessionID;
        if (expires) {
            this.sessionExpiration = expires;
            localStorage.setItem(sessionExpirationKey, expires.toISOString());
            localStorage.setItem(sessionIDKey, sessionID);
            return;
        }
        sessionStorage.setItem(sessionIDKey, sessionID);
    }

    public loadSession(): void {
        [this.sessionID, this.sessionExpiration] = getSession();
    }

    public clearSession(): void {
        sessionStorage.clear();
        localStorage.removeItem(sessionExpirationKey);
        localStorage.removeItem(sessionIDKey);
    }

    public async refreshCSRFToken(): Promise<void> {
        if (!hasSession()) {
            throw new Error("Cannot refresh a CSRF Token without a session");
        }

        await this.get("/v1/sessions");
    }

    public async signedURL(url: string): Promise<string> {
        if (!hasSession()) {
            throw new Error("Cannot create a signed url without a session");
        }

        const res = await this.post<{ token: string }>("/v1/sessions/token");

        if (!res.response) {
            throw new Error("No response from session request");
        }

        const token = res.response.token;

        if (url.indexOf("?") === -1) {
            return `${url}?authorization=${token}`;
        }

        return `${url}&authorization=${token}`;
    }
}

