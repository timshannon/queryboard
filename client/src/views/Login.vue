<template>
  <form>
    <cds-form-group layout="vertical">
      <cds-input layout="vertical">
        <label>Username</label>
        <input v-model="username" placeholder="username" />
        <!-- <cds-control-message>message text</cds-control-message> -->
      </cds-input>
      <cds-password layout="vertical">
        <label>Password</label>
        <input v-model="password" type="password" />
        <!-- <cds-control-message>message text</cds-control-message> -->
      </cds-password>
    </cds-form-group>
  </form>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import { ref } from "vue";

import "@cds/core/input/register";
import "@cds/core/password/register";

export default {
  setup() {
    const username = ref("");
    const password = ref("");
    return {
      username,
      password,
    };
  },
};
</script>
