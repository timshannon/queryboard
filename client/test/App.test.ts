import { shallowMount } from "@vue/test-utils";
// import mock from "xhr-mock";

import App from "../src/App.vue";

//     $t: (text) => text
// }


describe("App.vue", () => {
    // beforeEach((done) => {
    //     mock.setup();
    //     done();
    // });

    // afterEach(() => mock.teardown());

    const wrapper = shallowMount(App);

    it("should render when mounted", () => {
        expect(wrapper.find("div").exists());
    });

});
