<template>
  <div>
    <div cds-layout="grid cols@md:4 gap:md">
      <div cds-layout="vertical gap:md">
        <nav class="tabs">
          <button
            v-for="(tab, index) in tabs"
            :key="index"
            role="presentation"
            class="tab"
            :class="{ active: tab.isActive }"
            :aria-selected="tab.isActive"
            @click="changeTab(tab.name)"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>
    </div>
    <slot />
  </div>
</template>
<style lang="scss" scoped>
.tabs {
  border-bottom: var(--cds-alias-object-border-width-100) solid
    var(--cds-alias-object-border-color);
  display: flex;
  width: 100%;
}

.tab {
  display: flex;
  gap: var(--cds-global-space-5);
  background: transparent;
  border: 0;
  color: var(--cds-alias-object-interaction-color);
  padding: var(--cds-global-space-5) var(--cds-global-space-6)
    var(--cds-global-space-4) var(--cds-global-space-6);
  border-bottom: var(--cds-alias-object-border-width-300) solid transparent;
  cursor: pointer;
  margin-right: var(--cds-global-space-5);
}

.tab cds-icon {
  margin-top: -1px;
}

.tab:hover,
.tab[hover] {
  border-bottom: var(--cds-alias-object-border-width-300) solid
    var(--cds-alias-object-interaction-background-highlight);
  color: var(--cds-alias-object-interaction-color-hover);
}

.tab:hover cds-icon,
.tab[hover] cds-icon,
.tab cds-icon:hover {
  --color: var(--cds-alias-object-interaction-color-hover);
  cursor: pointer;
}

.tab:active,
.tab[active],
.tab.active {
  border-bottom: var(--cds-alias-object-border-width-300) solid
    var(--cds-alias-object-interaction-background-highlight);
  //background: var(--cds-alias-object-interaction-background-active);
  color: var(--cds-alias-object-interaction-color-active);
}

.tab:active cds-icon,
.tab[active] cds-icon,
.tab.active cds-icon {
  --color: var(--cds-alias-object-interaction-color-active);
}

.tab[selected] {
  border-bottom: var(--cds-alias-object-border-width-300) solid
    var(--cds-alias-object-interaction-background-highlight);
  color: var(--cds-alias-object-interaction-selected);
}

.tab[disabled] {
  color: var(--cds-alias-object-interaction-color-disabled);
  border-bottom: var(--cds-alias-object-border-width-300) solid transparent;
  cursor: not-allowed;
}

.tab[disabled] cds-icon {
  --color: var(--cds-alias-object-interaction-color-disabled);
  cursor: not-allowed;
}

.tab[focused] {
  outline: var(--cds-alias-object-interaction-outline);
  outline-offset: var(--cds-alias-object-interaction-outline-offset);
}

@media (-webkit-min-device-pixel-ratio: 0) {
  .tab[focused] {
    outline-color: -webkit-focus-ring-color;
  }
}
</style>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { provide, ref } from "vue";
// import "@cds/core/icon/register.js";

export interface Tab {
  isActive: boolean;
  name: string;
}


export default {
  setup() {
    const tabs = ref<Tab[]>([]);


    const addTab = (name: string, isActive: boolean) => {
      tabs.value.push({ name, isActive });
    }

    function changeTab(name: string) {
      tabs.value.map((t: Tab) => (t.isActive = t.name === name));
    }

    provide("addTab", addTab);
    provide("tabs", tabs);

    return {
      tabs,
      changeTab,
    };
  },
};
</script>
<style lang="scss">
</style>

