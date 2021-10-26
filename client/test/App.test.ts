import { shallowMount } from "@vue/test-utils";

import App from "../src/App.vue";

import { Client } from "../src/http";

describe("App.vue", () => {
    it("should render when mounted", () => {
        const wrapper = shallowMount(App);
        expect(wrapper.find("div").exists());
        expect(wrapper.find("login-stub").exists());
    });

    it("should display the applicationw when logged in", () => {
        const client = new Client("");
        client.setSession("testSession");
        const wrapper = shallowMount(App);

        expect(wrapper.find("div").exists());
        expect(wrapper.find("sidebar-stub").exists());
    });

});
