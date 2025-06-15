<template>
    <button
        type="button"
        class="icon-button"
        :class="{
            'screen-menu': screenMenu
        }"
        :title="screenMenu ? undefined : label"
        :style="{ '--icon-color': iconColor }"
    >
        <template v-if="screenMenu">
            <span class="screen-menu-label">{{ label }}</span>
            <span class="spacer" />
        </template>

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
    },
    screenMenu: {
        type: Boolean,
        default: false
    },
    iconColor: {
        type: String,
        default: undefined
    }
});
</script>
<style scoped>
.icon-button {
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--icon-color, var(--vp-c-text-1));
    transition: color 0.5s;
}

.icon-button.screen-menu {
    display: flex;
    width: 100%;
    line-height: 24px;
    padding: 12px 0 11px;
}

.icon-button:not(.screen-menu) {
    height: 36px;
    width: 36px;
}

.icon-button:hover:not(:disabled) {
    color: var(--vp-c-brand-1);
    transition: color 0.25s;
}

.icon-button:disabled {
    color: var(--vp-c-text-3);
}

.icon-button span:last-child {
    height: 20px;
    width: 20px;
    fill: currentColor;
}

.icon-button.screen-menu span:last-child {
    margin-right: 22px;
}

.screen-menu-label {
    font-size: 14px;
    font-weight: 500;
    margin-right: 0.5em;
}

.spacer {
    flex: 1;
}
</style>
