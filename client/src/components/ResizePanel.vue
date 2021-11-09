<template>
  <div :cds-layout="orientation">
    <div :style="style1" ref="slot1">
      <slot name="1"></slot>
    </div>
    <cds-divider
      :orientation="dividerOrientation"
      cds-layout="align:shrink"
      @mousedown="startResize"
      class="draggable"
    />
    <div :style="style2" ref="slot2">
      <slot name="2"></slot>
    </div>
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
</style>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import "@cds/core/divider/register.js";
import { computed, ref } from "vue";

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
      }
    },

  },
  setup(props) {
    const slot1 = ref<HTMLElement>();
    const slot2 = ref<HTMLElement>();
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

    const style1 = computed((): any => {
      if (!size1.value) {
        return null;
      }

      if (props.orientation == orientation.HORIZONTAL) {
        return {
          width: size1.value + "px"
        };
      }
      return {
        height: size1.value + "px"
      };
    });

    const style2 = computed((): any => {
      if (!size2.value) {
        return null;
      }

      if (props.orientation == orientation.HORIZONTAL) {
        return {
          width: size2.value + "px"
        };
      }
      return {
        height: size2.value + "px"
      };
    });


    function resize(e: MouseEvent) {
      if (repaintWait) {
        requestAnimationFrame(() => {
          // only update width and delta on animation frames (60fps)
          repaintWait = false;
          if (props.orientation == orientation.HORIZONTAL) {
            size1.value = size1.value + (e.clientX - startOffset);
            size2.value = size2.value - (e.clientX - startOffset);
            startOffset = e.clientX;
          } else {
            size1.value = size1.value + (e.clientY - startOffset);
            size2.value = size2.value - (e.clientY - startOffset);
            startOffset = e.clientY;
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
      if (!slot1.value || !slot2.value) {
        return false;
      }

      if (props.orientation == orientation.HORIZONTAL) {
        size1.value = slot1.value.offsetWidth;
        size2.value = slot2.value.offsetWidth;
        startOffset = e.clientX;
      } else {
        size1.value = slot1.value.offsetHeight;
        size2.value = slot2.value.offsetHeight;
        startOffset = e.clientY;
      }

      document.addEventListener("mousemove", resize, false);
      document.addEventListener("mouseup", stopResize, false);
      return false;
    }

    return {
      slot1,
      slot2,
      dividerOrientation,
      resize,
      startResize,
      size1,
      size2,
      style1,
      style2,
    };
  }
};
</script>
