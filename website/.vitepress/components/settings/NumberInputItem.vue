<template>
    <SettingsItem :subtitle="subtitle">
        <NumberInput v-model="model" :default-value="defaultValue" />
    </SettingsItem>
</template>
<script setup lang="ts">
import NumberInput from "./NumberInput.vue";
import SettingsItem from "./SettingsItem.vue";

defineProps({
    subtitle: {
        type: String,
        required: true
    },
    defaultValue: {
        type: Number,
        required: true
    }
});

const model = defineModel({
    type: Number,
    required: false
});
</script>
