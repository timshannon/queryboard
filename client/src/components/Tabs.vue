<template>
  <div cds-layout="grid cols@md:4 gap:lg">
    <div cds-layout="vertical gap:md">
      <nav class="tabs">
        <slot />
      </nav>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.tabs {
  border-bottom: var(--cds-alias-object-border-width-100) solid
    var(--cds-alias-object-border-color);
  display: flex;
  width: 100%;
}
</style>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

//import { computed, onMounted, ref } from "vue";
import "@cds/core/icon/register.js";

import { ClarityIcons, homeIcon, downloadIcon, windowCloseIcon, plusIcon } from "@cds/core/icon";

export default {
  setup() {

    ClarityIcons.addIcons(homeIcon, downloadIcon, plusIcon, windowCloseIcon);
    return {};
  },
};
</script>
<style lang="scss">
</style>

