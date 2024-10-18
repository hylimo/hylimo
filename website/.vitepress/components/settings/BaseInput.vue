<template>
    <input v-model="model" class="text-field" :class="{ invalid: !isValid }" />
</template>
<script setup lang="ts">
defineProps({
    isValid: {
        type: Boolean,
        default: true
    }
});

const model = defineModel({
    type: String,
    required: true
});
</script>
<style scoped>
.text-field {
    background-color: var(--vp-c-bg-alt);
    border: 1px solid var(--vp-c-bg-alt);
    border-radius: 6px;
    padding: 0 12px;
    height: 34px;
    flex: 1 1 0;
    min-width: 0;
}

.text-field:hover,
.text-field:focus {
    border-color: var(--vp-c-brand);
}

.text-field.invalid {
    border-color: var(--vp-c-danger-1);
}
</style>
