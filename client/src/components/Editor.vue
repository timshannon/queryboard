<template>
  <div>
    <div class="editor" ref="monacoRef"></div>
  </div>
</template>
<style lang="scss">
.editor {
  width: 50vw;
  height: 75vh;
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

    onMounted(() => {
      editor = monaco.editor.create(monacoRef.value as HTMLElement, {
        value: "select * from table",
        language: "sql",
        minimap: {
          enabled: false,
        },
      })
    });

    onUnmounted(() => {
      editor.dispose();
    });


    return {
      monacoRef,
    };
  }
};
</script>
