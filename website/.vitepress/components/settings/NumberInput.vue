<template>
    <BaseInput v-model="cachedModel" :is-valid="isValid" :default-value="defaultValue.toString()" />
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import BaseInput from "./BaseInput.vue";

defineProps({
    defaultValue: {
        type: Number,
        required: true
    }
});

const model = defineModel({
    type: Number,
    required: false
});

const isValid = ref(true);
const cachedModel = ref("");

watch(
    model,
    (newValue) => {
        if (Number.parseFloat(cachedModel.value) != newValue) {
            cachedModel.value = newValue?.toString() ?? "";
        }
    },
    { immediate: true }
);

watch(
    cachedModel,
    (newValue) => {
        if (newValue.trim() === "") {
            isValid.value = true;
            model.value = undefined;
        } else {
            isValid.value = /^(0|[1-9][0-9]*)?(\.[0-9]*)?$/.test(newValue.trim());
            if (isValid.value) {
                const parsedValue = Number.parseFloat(newValue);
                if (model.value !== parsedValue) {
                    model.value = parsedValue;
                }
            }
        }
    },
    { immediate: true }
);
</script>
