<template>
    <template v-if="offlineReady">
        <div class="pwa-snackbar" role="alertdialog" aria-labelledby="pwa-message">
            <div id="pwa-message" class="snackbar-message">App ready to work offline</div>
            <div class="progress-bar" :style="{ width: progressWidth + '%' }"></div>
        </div>
    </template>
</template>
<script setup lang="ts">
import { ref, onBeforeMount } from "vue";

const offlineReady = ref(false);
const progressWidth = ref(100);

function onOfflineReady() {
    offlineReady.value = true;
    startProgress();
}

function startProgress() {
    let startTime: number | null = null;
    const duration = 2500;

    function animateProgress(timestamp: number) {
        if (!startTime) {
            startTime = timestamp;
        }
        const elapsed = timestamp - startTime;
        const progress = Math.max(0, 100 - (elapsed / duration) * 100);
        if (progress <= 0) {
            offlineReady.value = false;
        } else {
            progressWidth.value = progress;
            requestAnimationFrame(animateProgress);
        }
    }

    requestAnimationFrame(animateProgress);
}

onBeforeMount(async () => {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
        immediate: true,
        onOfflineReady,
        onRegistered() {
            // eslint-disable-next-line no-console
            console.info("Service Worker registered");
        },
        onRegisterError(e) {
            // eslint-disable-next-line no-console
            console.error("Service Worker registration error!", e);
        }
    });
});
</script>
<style scoped>
.pwa-snackbar {
    position: fixed;
    right: 1rem;
    top: calc(var(--vp-nav-height) + 1rem);
    background-color: var(--vp-c-bg);
    color: var(--vp-c-text-1);
    border-radius: 8px;
    box-shadow: var(--vp-shadow-3);
    z-index: 100;
}

.snackbar-message {
    margin: 16px;
}

.progress-bar {
    height: 4px;
    background-color: var(--vp-c-brand-1-1);
    margin-left: auto;
}
</style>
