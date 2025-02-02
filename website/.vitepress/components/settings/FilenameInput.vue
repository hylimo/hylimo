<template>
    <input v-model="filename" class="filename-input" :class="{ invalid: filename.length === 0 }" />
</template>
<script setup lang="ts">

const filename = defineModel({
    type: String,
    default: "diagram",
});
</script>
<style scoped>
.filename-input {
    background-color: var(--vp-c-bg);
    border-radius: 6px;
    padding: 2px 12px 2px 4px;
    max-height: 34px;
    max-width: 40ch;
    width: auto;
    flex-shrink: 1; /* Allow shrinking in flex containers */
    box-sizing: border-box; /* Ensure padding is included in width */
    min-width: 5ch;
}

.filename-input:hover,
.filename-input:focus {
    background-color: var(--vp-c-bg-soft);
}

.filename-input.invalid {
    background-color: var(--vp-c-danger-soft);
}
</style>
