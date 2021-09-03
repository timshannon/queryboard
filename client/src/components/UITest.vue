<template>
  <section cds-layout="grid align:stretch gap:md">
    <div cds-layout="vertical gap:lg col:12">
      <cds-input layout="vertical">
        <label>Text Input</label>
        <input type="text" value="hello world" />
        <cds-control-message>message text</cds-control-message>
      </cds-input>

      <cds-range layout="vertical">
        <label>label</label>
        <input type="range" />
        <cds-control-message>message text</cds-control-message>
      </cds-range>

      <cds-checkbox-group layout="vertical-inline">
        <label>Checkbox Group</label>
        <cds-checkbox>
          <label>checkbox 1</label>
          <input type="checkbox" checked />
        </cds-checkbox>

        <cds-checkbox>
          <label>checkbox 2</label>
          <input type="checkbox" />
        </cds-checkbox>

        <cds-checkbox>
          <label>checkbox 3</label>
          <input type="checkbox" />
        </cds-checkbox>

        <cds-control-message>message text</cds-control-message>
      </cds-checkbox-group>

      <cds-radio-group layout="vertical-inline">
        <label>Radio Group</label>
        <cds-radio>
          <label>radio 1</label>
          <input type="radio" checked />
        </cds-radio>

        <cds-radio>
          <label>radio 2</label>
          <input type="radio" />
        </cds-radio>

        <cds-radio>
          <label>radio 3</label>
          <input type="radio" />
        </cds-radio>

        <cds-control-message>message text</cds-control-message>
      </cds-radio-group>

      <div>
        <div cds-layout="horizontal gap:lg align:vertical-center">
          <cds-progress-circle status="info" size="xl"></cds-progress-circle>

          <cds-button status="primary">button</cds-button>

          <cds-button status="primary" action="outline">button</cds-button>

          <cds-tag readonly status="info">
            <cds-icon shape="info-standard"></cds-icon>Info
            <cds-badge status="info">1</cds-badge>
          </cds-tag>

          <cds-icon shape="user" size="lg" badge="info"></cds-icon>
        </div>
      </div>

      <cds-alert-group status="info">
        <cds-alert closable>
          This example is a closable banner alert inside a banner alert group.
        </cds-alert>
      </cds-alert-group>
    </div>
    <div cds-layout="col:1 horizontal align:center">
      <cds-divider orientation="vertical" style="height: 100%"></cds-divider>
    </div>
  </section>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import "@cds/core/button/register.js";
import "@cds/core/input/register.js";
import "@cds/core/range/register.js";
import "@cds/core/icon/register.js";
import "@cds/core/tag/register.js";
import "@cds/core/checkbox/register.js";
import "@cds/core/radio/register.js";
import "@cds/core/alert/register.js";
import "@cds/core/divider/register.js";

import { ClarityIcons, userIcon, infoStandardIcon } from "@cds/core/icon";



export default {
  components: {
  },
  setup() {
    ClarityIcons.addIcons(userIcon, infoStandardIcon);

    return {
    };
  }
};
</script>
