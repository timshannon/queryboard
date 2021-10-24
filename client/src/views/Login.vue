<template>
  <div cds-layout="container:xs container:center p:xxl" cds-text="center">
    <h1 cds-text="display" cds-layout="p:xxl">QueryBoard</h1>
    <cds-alert-group v-if="error" cds-layout="p-b:md" status="danger">
      <cds-alert>{{ error }}</cds-alert>
    </cds-alert-group>

    <form @submit="login">
      <cds-form-group layout="vertical">
        <cds-input layout="vertical">
          <label>Username</label>
          <input
            v-model="username"
            v-focus
            name="username"
            placeholder="username"
          />
        </cds-input>
        <cds-password layout="vertical">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="password" />
        </cds-password>
        <cds-checkbox>
          <label>Remember me</label>
          <input v-model="rememberMe" type="checkbox" name="rememberMe" />
        </cds-checkbox>
      </cds-form-group>
      <div cds-text="right">
        <cds-button
          type="submit"
          :loading-state="loading ? 'loading' : 'default'"
        >
          Login
        </cds-button>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
// Copyright 2021 Tim Shannon.
// All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
import { ref } from "vue";

import "@cds/core/input/register";
import "@cds/core/password/register";
import "@cds/core/checkbox/register";
import "@cds/core/alert/register";
import "@cds/core/button/register";

import server from "../services/server";
import { HttpError } from "../http";

export default {
  directives: {
    focus: {
      mounted: (el: HTMLElement) => {
        el.focus();
      },
    },
  },
  emits: ["login"],
  setup(_, context) {
    const username = ref("");
    const password = ref("");
    const rememberMe = ref(true);
    const error = ref("");
    const loading = ref(false);

    async function login(e: Event) {
      e.preventDefault();
      if (!username.value) {
        error.value = "Username is required";
        return;
      }

      if (!password.value) {
        error.value = "Password is required";
        return;
      }

      try {
        loading.value = true;
        await server.login(username.value, password.value, rememberMe.value);
        loading.value = false;
        context.emit("login");
      } catch (err) {
        loading.value = false;
        error.value = (err as HttpError).message;
      }
    }

    return {
      username,
      password,
      rememberMe,
      error,
      loading,
      login,
    };
  },
};
</script>
