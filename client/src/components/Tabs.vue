<template>
  <div :class="{ 'tabs-vertical': vertical }">
    <ul class="nav" role="tablist">
      <li
        v-for="(tab, index) in tabs"
        :key="index"
        role="presentation"
        class="nav-item"
      >
        <button
          class="btn btn-link nav-link"
          :class="{ active: tab.isActive }"
          :aria-selected="tab.isActive"
          type="button"
          @click="changeTab(tab.name)"
        >
          {{ tab.name }}
        </button>
      </li>
      <li v-if="overflow.length > 0" role="presentation" class="nav-item">
        <CommonDropDown :class="overflowDir" :btn-class="overflowClass">
          <template v-slot:btn-content>
            <cds-icon shape="ellipsis-horizontal"></cds-icon>
          </template>
          <template v-for="(tab, index) in overflow" :key="index">
            <button
              :class="{ active: tab.isActive }"
              :aria-selected="tab.isActive"
              role="tab"
              type="button"
              class="btn"
              @click="changeTab(tab.name)"
            >
              {{ tab.name }}
            </button>
          </template>
        </CommonDropDown>
      </li>
    </ul>
    <slot />
  </div>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { computed, onMounted, ref } from "vue";
import DropDown from "./DropDown.vue";
import "@cds/core/icon/register.js";
import { ClarityIcons, ellipsisHorizontalIcon } from "@cds/core/icon";

ClarityIcons.addIcons(ellipsisHorizontalIcon);


interface Tab {
  isActive: boolean;
  overflow: boolean;
  name: string;
  to?: string;
  isRouterTab: boolean;
  isTab?: boolean;
}

export default {
  components: {
    DropDown,
  },
  props: {
    vertical: Boolean,
    overflowDir: { type: String, default: "bottom-right" },
  },
  setup() {
    const tabs = ref<Tab[]>([]);
    const overflow = ref<Tab[]>([]);

    function changeTab(name: string) {
      tabs.value.map((t: Tab) => (t.isActive = t.name === name));
      overflow.value.map((t: Tab) => (t.isActive = t.name === name));
    }

    const overflowActive = computed((): boolean => {
      for (const tab of overflow.value) {
        if (tab.isActive) {
          return true;
        }
      }
      return false;
    });

    const overflowClass = computed((): string => {
      if (overflowActive.value) {
        return "btn btn-link nav-link btn-overflow active";
      }
      return "btn btn-link nav-link btn-overflow";
    });

    onMounted(async function (this) {
      for (const tab of this.$children) {
        const commonTab = tab as any;
        if (commonTab.isTab || commonTab.isRouterTab) {
          if (commonTab.overflow) {
            overflow.value.push(commonTab);
          } else {
            tabs.value.push(commonTab);
          }
        }
      }
      await this.$nextTick();
      for (const child of this.$children) {
        if (child.$options.name === "RouterLink") {
          if (child.$el.classList.contains("active")) {
            changeTab(child.$attrs.name);
          }
        }
      }
    });

    return {
      tabs,
      overflow,
      changeTab,
      overflowClass,
      overflowActive,
    };
  },
};
</script>
<style lang="scss">
.dropdown .dropdown-toggle.btn.btn-overflow {
  padding-right: 0.125rem;
  padding-left: 0.125rem;
}
</style>

