<template>
    <div class="color-input-wrapper">
        <div
            class="color-picker-wrapper"
            :style="{
                backgroundColor: model
            }"
        >
            <input v-model="cachedModel" type="color" class="color-picker" />
        </div>
        <BaseInput v-model="cachedModel" :is-valid="isValid" class="color-input" />
    </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import BaseInput from "./BaseInput.vue";

const model = defineModel({
    type: String,
    required: true
});

const isValid = ref(true);
const cachedModel = ref("");

watch(
    model,
    (newValue) => {
        if (cachedModel.value !== newValue) {
            cachedModel.value = newValue;
        }
    },
    { immediate: true }
);

watch(
    cachedModel,
    (newValue) => {
        isValid.value = /^#[0-9a-fA-F]{6}$/.test(newValue.trim());
        if (isValid.value) {
            model.value = newValue.trim();
        }
    },
    { immediate: true }
);
</script>
<style scoped>
.color-input {
    font-family: var(--vp-font-family-mono);
}

.color-input-wrapper {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
}

.color-picker-wrapper {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--vp-c-neutral);
    overflow: hidden;
    margin-right: 10px;
}

.color-picker-wrapper:hover,
.color-picker-wrapper:focus-within {
    border-color: var(--vp-c-brand);
}

.color-picker {
    opacity: 0;
    cursor: pointer;
    width: 34px;
    height: 34px;
}
</style>
