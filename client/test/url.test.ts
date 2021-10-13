// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import * as url from "../src/url";

describe("fromQ uery", () => {
    it("should return simple objects", () => {
        expect(url.fromQuery("name=ferret&color=purple"))
            .toEqual({ name: "ferret", color: "purple" });
    });

    it("should return arrays", () => {
        expect(url.fromQuery("name=ferret&name=wolf"))
            .toEqual({ name: ["ferret", "wolf"] });
    });

    it("should handle objects and arrays together", () => {
        expect(url.fromQuery("color=purple&name=ferret&name=wolf"))
            .toEqual({ color: "purple", name: ["ferret", "wolf"] });
    });

    it("should use window.location.search", () => {
        window.history.pushState({}, "", "?color=purple&name=ferret&name=wolf");

        expect(url.fromQuery())
            .toEqual({ color: "purple", name: ["ferret", "wolf"] });
    });
});

describe("toQuery", () => {
    it("should handle objects and arrays", () => {
        expect(url.toQuery({
            name: "ferret",
            color: [
                "red",
                "blue",
            ],
        }))
            .toEqual("?name=ferret&color=red&color=blue");
    });

    it("should handle nulls and undefined", () => {
        expect(url.toQuery({
            name: "ferret",
            color: undefined,
            shape: null,
        }))
            .toEqual("?name=ferret&color&shape");
    });

    it("should handle numbers", () => {
        expect(url.toQuery({
            limit: 100,
            offset: 0,
        }))
            .toEqual("?limit=100&offset=0");
    });
    it("should handle booleans", () => {
        expect(url.toQuery({
            valid: true,
            invalid: false,
        })).toEqual("?valid");
    });

});

describe("join", () => {
    it.each([
        [["alpha", "beta", "gamma"], "alpha/beta/gamma"],
        // [["/alpha/", "/beta/", "/gamma/"], "/alpha/beta/gamma/"],
        // [["alpha/", "/beta//", "////gamma/"], "alpha/beta/gamma/"],
        // [["alpha/", "/beta\/", "////gamma/"], "alpha/beta/gamma/"],
        // [["alpha/", "/beta\/", "/\?//gamma/"], "alpha/beta?/gamma/"],
        // [["https://google.com", "path", "?search=test#tester"], "https://google.com/path?search=test#tester"],
        // [["https://google.com/thepath", "#tester"], "https://google.com/thepath#tester"],
    ])("should join %s cleanly", (join, expected) => {
        expect(url.join(...join)).toBe(expected);
    });
});

