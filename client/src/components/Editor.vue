<template>
  <div class="editor-container" ref="container">
    <div class="editor" ref="monacoRef"></div>
  </div>
</template>
<style lang="scss">
.editor-container {
  width: 100%;
  height: 100%;
}
.editor {
  position: fixed;
}
</style>
<script lang="ts">
// Copyright 2021 Tim Shannon. 
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.

import { ref, onMounted, onUnmounted } from "vue";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import sqlWorker from "monaco-editor/esm/vs/basic-languages/sql/sql?worker";


export default {
  setup() {
    const monacoRef = ref<HTMLElement>();
    const container = ref<HTMLElement>();

    // @ts-ignore
    self.MonacoEnvironment = {
      getWorker(_: unknown, label: string) {
        if (label === "sql") {
          return new sqlWorker();
        }
        return new editorWorker();
      }
    };

    let editor: monaco.editor.IStandaloneCodeEditor;

    const resizeObserver = new ResizeObserver(() => {
      if (container.value) {
        editor.layout({ width: container.value?.offsetWidth, height: container.value?.offsetHeight });
      }
    });

    onMounted(() => {
      editor = monaco.editor.create(monacoRef.value as HTMLElement, {
        value: "select * \nfrom table\nwhere name = 'test'\nand id = 3;",
        language: "sql",
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
      });
      resizeObserver.observe(container.value as HTMLElement);
    });

    onUnmounted(() => {
      resizeObserver.disconnect();
      editor.dispose();
    });

    return {
      monacoRef,
      container,
    };
  }
};
</script>
