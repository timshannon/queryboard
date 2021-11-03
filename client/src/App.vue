<template>
  <div cds-layout="p:sm">
    <div v-if="loggedIn" cds-layout="vertical align:stretch">
      <header cds-layout="p:md">
        <Toolbar />
      </header>
      <cds-divider />
      <div cds-layout="horizontal align:vertical-stretch wrap:none">
        <nav cds-layout="p:md p@md:lg">
          <Sidebar />
        </nav>
        <cds-divider orientation="vertical" />
        <div cds-layout="vertical align:stretch">
          <div>
            <div cds-layout="vertical gap:md p:lg">
              <Tabs>
                <Tab name="untitled" selected>
                  <Editor />
                </Tab>
                <Tab name="untitled-1">
                  <h1>other tab</h1>
                </Tab>
              </Tabs>
            </div>
          </div>
          <cds-divider />
          <footer cds-layout="p-y:md p-x:lg">footer</footer>
        </div>
      </div>
    </div>
    <Login v-else @login="checkSession" />
  </div>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import "@cds/core/divider/register.js";
import { ref } from "vue";

import Login from "./views/Login.vue";
import Sidebar from "./views/Sidebar.vue";
import Toolbar from "./views/Toolbar.vue";
import Editor from "./components/Editor.vue";
import Tabs from "./components/Tabs.vue";
import Tab from "./components/Tab.vue";

import { hasSession } from "./http";

export default {
  components: {
    Login,
    Toolbar,
    Sidebar,
    Editor,
    Tabs,
    Tab,
  },
  setup() {
    const loggedIn = ref(hasSession());

    function checkSession() {
      loggedIn.value = hasSession();
    }

    return {
      loggedIn,
      checkSession,
    };
  }
};
</script>
