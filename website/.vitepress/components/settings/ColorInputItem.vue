<template>
    <SettingsItem :subtitle="subtitle">
        <ColorInput v-model="model" />
    </SettingsItem>
</template>
<script setup lang="ts">
import ColorInput from "./ColorInput.vue";
import SettingsItem from "./SettingsItem.vue";

defineProps({
    subtitle: {
        type: String,
        required: true
    }
});

const model = defineModel({
    type: String,
    required: true
});
</script>
