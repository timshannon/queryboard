<template>
  <section v-if="isActive" role="tabpanel" :aria-labelledby="name">
    <slot />
  </section>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import { ref } from "vue";

export default {
  props: {
    name: { type: String, required: true },
    selected: Boolean,
    overflow: Boolean,
  },
  setup(props) {
    const isActive = ref(props.selected || false);

    return {
      isActive,
      isTab: true,
    };
  },
};
</script>

