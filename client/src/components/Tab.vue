<template>
  <section v-if="isActive" role="tabpanel" :aria-labelledby="name">
    <slot />
  </section>
</template>
<style lang="scss" scoped></style>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import { computed, inject, ref, Ref } from "vue";

import { Tab } from "./Tabs.vue";

export default {
  props: {
    name: { type: String, required: true },
    selected: Boolean,
  },
  setup(props) {
    const tabs = inject<Ref<Tab[]>>("tabs", ref([]));

    const addTab = inject<(name: string, isActive: boolean) => void>("addTab");
    if (addTab) {
      addTab(props.name, props.selected)
    }

    const isActive = computed(() => {
      return tabs.value.find(t => t.isActive && t.name == props.name) != undefined;
    });

    return {
      isActive,
    };
  },
};
</script>

