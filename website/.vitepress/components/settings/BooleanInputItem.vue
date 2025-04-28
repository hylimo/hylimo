<template>
    <SettingsItem :subtitle="subtitle">
        <VPSwitch :class="{ checked: model }" @click="model = !model" />
    </SettingsItem>
</template>
<script setup lang="ts">
import VPSwitch from "vitepress/dist/client/theme-default/components/VPSwitch.vue";
import SettingsItem from "./SettingsItem.vue";

defineProps({
    subtitle: {
        type: String,
        required: true
    }
});

const model = defineModel({
    type: Boolean,
    required: true
});
</script>
<style scoped>
.VPSwitch.checked :deep(.check) {
    transform: translateX(18px);
}

.VPSwitch.checked {
    background-color: var(--vp-c-brand-1);
    transition:
        border-color 0.25s,
        background-color 0.4s ease !important;
}
</style>
