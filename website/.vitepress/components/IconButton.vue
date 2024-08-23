<template>
    <button type="button" class="icon-button" :title="label">
        <span :class="[icon]" />
    </button>
</template>
<script setup lang="ts">
defineProps({
    label: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    }
});
</script>
<style scoped>
.icon-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 36px;
    height: 36px;
    color: var(--vp-c-text-1);
    transition: color 0.5s;
}

.icon-button:hover {
    color: var(--vp-c-brand-1);
    transition: color 0.25s;
}

.icon-button span {
    width: 20px;
    height: 20px;
    fill: currentColor;
}
</style>
