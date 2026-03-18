<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="app-shell">
    <header class="top-header">
      <div class="brand-wrap">
        <img src="/joins.png" alt="logo" class="brand-logo" />
        <div>
          <h1>일일 업무 공유</h1>
        </div>
      </div>
    </header>

    <RouterView />
  </main>
</template>
