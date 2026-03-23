<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="app-shell">
    <header class="top-header">
      <div class="brand-wrap">
        <div>
          <h1>디자인파트 일일 업무</h1>
        </div>
        <img src="/joins.png" alt="logo" class="brand-logo" />        
      </div>
    </header>

    <RouterView />
  </main>
</template>
