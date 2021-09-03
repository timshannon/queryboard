<template>
  <cds-tree>
    <cds-tree-item expanded>
      David Wallace (CFO)
      <cds-tree-item expanded>
        Michael Scott (Regional Manager)

        <cds-tree-item
          >Dwight K. Schrute (Assistant to the Regional Manager)</cds-tree-item
        >

        <cds-tree-item>
          Jim Halpert (Head of Sales)
          <cds-tree-item>Andy Bernard</cds-tree-item>
          <cds-tree-item>Stanley Hudson</cds-tree-item>
          <cds-tree-item>Phyllis Vance</cds-tree-item>
          <cds-tree-item>Todd Packer</cds-tree-item>
        </cds-tree-item>

        <cds-tree-item>
          Angela Martin (Head of Accounting)
          <cds-tree-item>Kevin Malone</cds-tree-item>
          <cds-tree-item>Oscar Martinez</cds-tree-item>
        </cds-tree-item>

        <cds-tree-item>
          Kelly Kapoor (Head of Customer Service)
          <cds-tree-item>Ryan Howard (Temp)</cds-tree-item>
        </cds-tree-item>

        <cds-tree-item> Creed Bratton (Quality Assurance) </cds-tree-item>

        <cds-tree-item> Meredith Palmer (Supplier Relations) </cds-tree-item>

        <cds-tree-item> Toby Flenderson (Human Resources) </cds-tree-item>

        <cds-tree-item> Pam Beesly (Reception) </cds-tree-item>

        <cds-tree-item> Darryl Philbin (Warehouse) </cds-tree-item>
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
