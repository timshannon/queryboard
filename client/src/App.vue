<template>
  <div>
    <Login v-if="hasSession" />
    <div v-else cds-layout="vertical align:stretch">
      <header cds-layout="p:md p@md:lg">
        <Toolbar />
      </header>
      <div cds-layout="horizontal align:vertical-stretch wrap:none">
        <nav cds-layout="p:md p@md:lg">
          <Sidebar />
        </nav>
        <cds-divider orientation="vertical" />
        <div cds-layout="vertical align:stretch">
          <div>
            <div cds-layout="vertical gap:md p:lg">
              <Editor />
            </div>
          </div>
          <cds-divider />
          <footer cds-layout="p-y:md p-x:lg">footer</footer>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import Login from "./views/Login.vue";
import Sidebar from "./views/Sidebar.vue";
import Toolbar from "./views/Toolbar.vue";
import Editor from "./views/Editor.vue";

import "@cds/core/divider/register.js";

import { hasSession } from "./http";

export default {
  components: {
    Login,
    Toolbar,
    Sidebar,
    Editor,
  },
  setup() {
    return {
      hasSession,
    };
  }
};
</script>
