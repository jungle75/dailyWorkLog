import { createRouter, createWebHistory } from 'vue-router'
import DailyPage from './pages/DailyPage.vue'
import DownloadPage from './pages/DownloadPage.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/daily' },
    { path: '/daily', name: 'daily', component: DailyPage },
    { path: '/download', name: 'download', component: DownloadPage },
  ],
})
