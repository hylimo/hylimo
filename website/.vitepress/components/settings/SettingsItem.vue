<template>
    <p class="subtitle">{{ subtitle }}</p>
    <div class="wrapper">
        <slot />
    </div>
</template>
<script setup lang="ts">
defineProps({
    subtitle: {
        type: String,
        required: true
    }
});
</script>
<style scoped>
.subtitle {
    font-size: 16px;
    margin-top: 15px;
    margin-bottom: 8px;
}

.wrapper {
    display: flex;
    width: 100%;
}
</style>
