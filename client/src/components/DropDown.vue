<template>
  <div class="dropdown" :class="dropdownClass">
    <button class="dropdown-toggle" :class="btnClassComputed" @click="toggle">
      <slot name="btn-content">
        {{ text }}
        <cds-icon shape="angle"></cds-icon>
      </slot>
    </button>
    <div class="dropdown-menu">
      <slot />
    </div>
  </div>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { computed, onMounted, onUnmounted, ref } from "vue";
import "@cds/core/icon/register.js";
import { ClarityIcons, angleIcon } from "@cds/core/icon";

ClarityIcons.addIcons(angleIcon);


export default {
  components: {
  },
  props: {
    btnClass: String,
    text: String,
    direction: {
      type: String,
      default: "bottom-right",
      validator: (value: string) => {
        return (
          [
            "bottom-left",
            "bottom-right",
            "top-left",
            "top-right",
            "left-bottom",
            "left-top",
            "right-top",
            "right-bottom",
          ].indexOf(value) !== -1
        );
      },
    },
  },
  setup(props, context) {
    const show = ref(false);
    const selfEvent = ref<Event | null>(null);

    const btnClassComputed = computed((): string => {
      if (props.btnClass) {
        return props.btnClass;
      }
      if (context.slots["btn-content"]) {
        return "";
      }
      return "btn btn-primary";
    });
    const dropdownClass = computed((): any => {
      const cls: any = {
        open: show.value,
      };

      cls[props.direction] = true;
      return cls;
    });

    function toggle(e: Event) {
      show.value = !show.value;
      selfEvent.value = e;
    }

    function close() {
      show.value = false;
      selfEvent.value = null;
    }

    function documentClose(e: Event) {
      if (e !== selfEvent.value) {
        close();
      }
    }

    // lifecycle events
    onMounted(() => {
      document.addEventListener("click", documentClose);
    });

    onUnmounted(() => {
      document.removeEventListener("click", documentClose);
    });

    return {
      show,
      selfEvent,
      btnClassComputed,
      dropdownClass,
      toggle,
      close,
    };
  },
};
</script>
<style lang="scss" scoped></style>

