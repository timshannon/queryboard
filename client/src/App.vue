<template>
  <section cds-layout="grid cols@sm:6 cols@md:3 gap:md">
    <SideBar />
    <UITest />
  </section>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import UITest from "./components/UITest.vue";
import SideBar from "./views/Sidebar.vue";

export default {
  components: {
    UITest,
    SideBar,
  },
  setup() {
    return {
    };
  }
};
</script>
