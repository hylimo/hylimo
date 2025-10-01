<template>
    <div class="wrapper">
        <HylimoEditor class="editor" :model-value="decodeURIComponent(code)" horizontal />
    </div>
</template>
<script setup lang="ts">
import { defineClientComponent } from "vitepress";

const HylimoEditor = defineClientComponent(() => import("./HylimoEditor.vue"));

defineProps({
    code: {
        type: String,
        required: true
    }
});
</script>
<style scoped>
.wrapper {
    width: 100%;
    aspect-ratio: 1 / 1;
}

.editor {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    border: 1px solid var(--vp-c-border);
    overflow: hidden;
    padding-top: 12px;
    background: var(--editor-background);
}
</style>
