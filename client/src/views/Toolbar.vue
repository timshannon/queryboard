<template>
  <div cds-layout="horizontal">
    <cds-button status="success" size="sm">New Board</cds-button>
    <cds-button cds-layout="align:right" size="sm">Settings</cds-button>
  </div>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import "@cds/core/button/register";

export default {
  setup() {
    return {
    };
  }
};
</script>
