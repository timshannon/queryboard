<template>
  <button class="tab"><slot /></button>
</template>
<style lang="scss" scoped>
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
.tab[active] {
  border-bottom: var(--cds-alias-object-border-width-300) solid
    var(--cds-alias-object-interaction-background-highlight);
  background: var(--cds-alias-object-interaction-background-active);
  color: var(--cds-alias-object-interaction-color-active);
}

.tab:active cds-icon,
.tab[active] cds-icon {
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
import { ref } from "vue";

export default {
  props: {
    name: { type: String, required: true },
    selected: Boolean,
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

