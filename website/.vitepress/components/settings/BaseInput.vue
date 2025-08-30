<template>
    <input v-model="model" class="text-field" :class="{ invalid: !isValid }" />
    <IconButton icon="vpi-rotate-cw" label="Reset" class="reset-button" @click="reset" />
</template>
<script setup lang="ts">
import IconButton from "../IconButton.vue";

const props = defineProps({
    isValid: {
        type: Boolean,
        default: true
    },
    defaultValue: {
        type: String,
        required: true
    }
});

const model = defineModel({
    type: String,
    required: true
});

function reset() {
    model.value = props.defaultValue;
}
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
    font-family: inherit;
}

.text-field:hover,
.text-field:focus {
    border-color: var(--vp-c-brand-1);
}

.text-field.invalid {
    border-color: var(--vp-c-danger-1);
}

.reset-button {
    width: 34px !important;
    height: 34px !important;
}
</style>
