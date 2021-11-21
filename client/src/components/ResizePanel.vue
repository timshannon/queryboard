<template>
  <div :cds-layout="orientation">
    <slot name="1"></slot>
    <cds-divider
      :orientation="dividerOrientation"
      cds-layout="align:shrink"
      ref="divider"
      @mousedown="startResize"
      class="draggable"
    />
    <slot name="2"></slot>
  </div>
</template>
<style lang="scss" scoped>
.draggable[orientation="vertical"] {
  cursor: col-resize;
  padding-left: var(--cds-global-space-3);
  padding-right: var(--cds-global-space-3);
}
.draggable[orientation="horizontal"] {
  cursor: row-resize;
  padding-top: var(--cds-global-space-3);
  padding-bottom: var(--cds-global-space-3);
}

.draggable:hover {
  --color: var(--cds-alias-object-interaction-background-highlight);
  --size: 0.1rem;
}
</style>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import "@cds/core/divider/register.js";
import { computed, ref, onMounted } from "vue";

export enum orientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export default {
  props: {
    orientation: {
      type: String,
      default: orientation.HORIZONTAL,
      validator: (value: orientation) => {
        return (
          [orientation.HORIZONTAL, orientation.VERTICAL].indexOf(value) !== -1
        );
      },
    },
  },
  setup(props) {
    let startOffset = -1;
    let repaintWait = false;
    const dividerOrientation = computed(() => {
      if (props.orientation == orientation.VERTICAL) {
        return orientation.HORIZONTAL;
      }
      return orientation.VERTICAL;
    });

    const size1 = ref(0);
    const size2 = ref(0);
    const divider = ref<HTMLElement>();
    var slot1: HTMLElement;
    var slot2: HTMLElement;

    function resize(e: MouseEvent) {
      if (repaintWait) {
        requestAnimationFrame(() => {
          // only update width and delta on animation frames (60fps)
          repaintWait = false;

          if (!slot1 || !slot2) {
            return;
          }

          if (props.orientation == orientation.HORIZONTAL) {
            size1.value = size1.value + (e.clientX - startOffset);
            size2.value = size2.value - (e.clientX - startOffset);
            startOffset = e.clientX;
            slot1.style.width = size1.value + "px";
            slot2.style.width = size2.value + "px";
          } else {
            size1.value = size1.value + (e.clientY - startOffset);
            size2.value = size2.value - (e.clientY - startOffset);
            startOffset = e.clientY;
            slot1.style.height = size1.value + "px";
            slot2.style.height = size2.value + "px";

          }
        });
      }
      repaintWait = true;

      return false;
    }

    function stopResize(): boolean {
      document.removeEventListener("mousemove", resize, false);
      document.removeEventListener("mouseup", stopResize, false);
      return false;
    }

    function startResize(e: MouseEvent): boolean {
      if (!slot1 || !slot2) {
        return false;
      }

      if (props.orientation == orientation.HORIZONTAL) {
        size1.value = slot1.offsetWidth;
        size2.value = slot2.offsetWidth;
        startOffset = e.clientX;
      } else {
        size1.value = slot1.offsetHeight;
        size2.value = slot2.offsetHeight;
        startOffset = e.clientY;
      }

      document.addEventListener("mousemove", resize, false);
      document.addEventListener("mouseup", stopResize, false);
      return false;
    }

    onMounted(() => {
      if (!divider.value) {
        return
      }

      slot1 = divider.value.previousElementSibling as HTMLElement;;
      slot2 = divider.value.nextElementSibling as HTMLElement;

    });

    return {
      dividerOrientation,
      resize,
      startResize,
      divider,
      size1,
      size2,
    };
  }
};
</script>
