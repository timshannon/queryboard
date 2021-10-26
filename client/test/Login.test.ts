// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { shallowMount } from "@vue/test-utils";
import mock from "xhr-mock";
// import flushPromises from "flush-promises";

import Login from "../src/views/Login.vue";


describe("Login.vue", () => {
    beforeEach((done) => {
        mock.setup();
        done();
    });

    afterEach(() => mock.teardown());

    const wrapper = shallowMount(Login);
    const form = wrapper.find("form");
    const username = wrapper.find("input[name='username']");

    it("should render when mounted", () => {
        expect(form.exists());
        expect(username.exists());
    });

    // it("should require email", async () => {
    //     form.trigger("submit");

    //     await flushPromises();
    //     const err = wrapper.find(".error");
    //     expect(err.exists()).toBeTruthy();
    //     expect(err.text()).toBe("Email is required");
    // });

    // it("should require a password", async () => {
    //     email.setValue("test@test.com");
    //     form.trigger("submit");
    //     await flushPromises();

    //     const err = wrapper.find(".error");
    //     expect(err.exists()).toBeTruthy();
    //     expect(err.text()).toBe("Password is required");
    // });

    // it("should handle service errors / failed logins", async () => {
    //     const msg = "Invalid username and / or password";
    //     mock.post(config.common.services.security + "/v1/sessions/password", (_, res) => {
    //         return res.status(400).body(`{ "message": "${msg}" }`);
    //     });
    //     email.setValue("test@test.com");

    //     // mockData because shallowMount means Password component isn't fully loaded
    //     wrapper.setData({ password: "BAdPassword" });

    //     await flushPromises();
    //     form.trigger("submit");
    //     await flushPromises();
    //     const err = wrapper.find(".error");
    //     expect(err.exists()).toBeTruthy();
    //     expect(err.text()).toBe(msg);
    // });

    // it("should set user after logging in successfully", async () => {
    //     const session = {
    //         id: "1234",
    //         expires: new Date(),
    //     };
    //     const user = {
    //         id: "1234",
    //         version: 0,
    //         email: "test@test.com",
    //     };

    //     mock.post(config.common.services.security + "/v1/sessions/password", (_, res) => {
    //         return res.status(201).body(JSON.stringify(session));
    //     });

    //     mock.get(config.common.services.security + "/v1/users", (_, res) => {
    //         return res.status(200).body(JSON.stringify(user));
    //     });

    //     email.setValue("test@test.com");

    //     // mockData because shallowMount means Password component isn't fully loaded
    //     wrapper.setData({ password: "GoodPassword" });

    //     form.trigger("submit");
    //     await flushPromises();
    //     expect(wrapper.vm.$store.commit).toHaveBeenCalledWith("setUser", user);
    // });

});

