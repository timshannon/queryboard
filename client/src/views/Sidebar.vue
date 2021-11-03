<template>
  <cds-tree>
    <cds-tree-item expanded
      >My Query Board
      <cds-tree-item expanded>
        table1
        <cds-tree-item> column_1 </cds-tree-item>
        <cds-tree-item> column_2 </cds-tree-item>
        <cds-tree-item> column_3 </cds-tree-item>
      </cds-tree-item>
      <cds-tree-item expanded>
        table2
        <cds-tree-item> column_1 </cds-tree-item>
        <cds-tree-item> column_2 </cds-tree-item>
        <cds-tree-item> column_3 </cds-tree-item>
      </cds-tree-item>
    </cds-tree-item>
  </cds-tree>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import "@cds/core/tree-view/register.js";

export default {
  components: {
  },
  setup() {
    return {
    };
  }
};
</script>
