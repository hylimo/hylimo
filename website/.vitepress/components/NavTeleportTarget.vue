<template>
    <div :id="targetId" class="nav-teleport-target" />
</template>
<script setup lang="ts">
defineProps({
    targetId: {
        type: String,
        required: true
    }
});
</script>
<style scoped>
.nav-teleport-target {
    display: flex;
    align-items: center;
    position: relative;
}
</style>
