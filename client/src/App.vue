<template>
  <div>
    <div v-if="loggedIn" id="appContainer" cds-layout="vertical">
      <Toolbar />
      <cds-divider />
      <ResizePanel
        orientation="horizontal"
        cds-layout="horizontal align:stretch"
      >
        <template v-slot:1>
          <nav cds-layout="align:shrink p:sm">
            <Sidebar />
          </nav>
        </template>
        <template v-slot:2>
          <ResizePanel orientation="vertical">
            <template v-slot:1>
              <Editor />
            </template>
            <template v-slot:2>
              <footer cds-layout="align:shrink p:md">footer</footer>
            </template>
          </ResizePanel>
        </template>
      </ResizePanel>
    </div>
    <Login v-else @login="checkSession" />
  </div>
</template>
<style lang="scss">
#appContainer {
  height: 100vh;
}
</style>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import "@cds/core/divider/register.js";
import { ref } from "vue";

import Login from "./views/Login.vue";
import Sidebar from "./views/Sidebar.vue";
import Toolbar from "./views/Toolbar.vue";
import Editor from "./components/Editor.vue";
import ResizePanel from "./components/ResizePanel.vue";

import { hasSession } from "./http";

export default {
  components: {
    Login,
    Toolbar,
    Sidebar,
    Editor,
    ResizePanel,
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
