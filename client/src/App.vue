<template>
  <div>
    <div v-if="loggedIn" id="appContainer" cds-layout="vertical">
      <Toolbar />
      <cds-divider />
      <div cds-layout="horizontal align:stretch">
        <nav cds-layout="p:sm align:shrink">
          <Sidebar />
        </nav>
        <cds-divider orientation="vertical" cds-layout="align:shrink" />
        <div cds-layout="vertical">
          <Editor />
          <cds-divider />
          <footer cds-layout="p:md">footer</footer>
        </div>
      </div>
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

import { hasSession } from "./http";

export default {
  components: {
    Login,
    Toolbar,
    Sidebar,
    Editor,
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
