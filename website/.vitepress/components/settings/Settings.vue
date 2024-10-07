<template>
    <IconButton
        icon="vpi-settings"
        label="Settings"
        class="settings-button"
        :class="{ 'screen-menu': screenMenu }"
        :screen-menu="screenMenu"
        @click="showDialog = true"
    />
    <ClientOnly>
        <Teleport to="body">
            <Transition name="modal">
                <div v-show="showDialog" class="modal-mask">
                    <div ref="dialog" class="modal-container">
                        <SettingsContent />
                    </div>
                </div>
            </Transition>
        </Teleport>
    </ClientOnly>
</template>
<script setup lang="ts">
import { ref } from "vue";
import IconButton from "../IconButton.vue";
import { onClickOutside } from "@vueuse/core";
import SettingsContent from "./SettingsContent.vue";

defineProps({
    screenMenu: {
        type: Boolean,
        default: false
    }
});

const showDialog = ref(false);
const dialog = ref<HTMLElement | null>(null);

onClickOutside(dialog, () => {
    showDialog.value = false;
});
</script>
<style scoped>
.settings-button {
    align-self: center;
}

.modal-mask {
    position: fixed;
    z-index: 200;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: start;
    justify-content: center;
    background: var(--vp-backdrop-bg-color);
    transition: opacity 0.5s;
}

.modal-container {
    width: min(calc(100% - 40px), 400px);
    margin-top: calc(var(--vp-nav-height) + 20px);
    background-color: var(--vp-c-bg);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
    transform: scale(1.1);
}

@media (max-width: 450px) {
    .settings-button:not(.screen-menu) {
        display: none;
    }
}
</style>
