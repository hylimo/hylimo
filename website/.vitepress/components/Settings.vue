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
                        <p class="title">Settings</p>
                        <div>
                            <div v-for="(name, key) in names" :key="key">
                                <p class="subtitle">{{ name }}</p>
                                <input
                                    v-model="cachedStringifiedSettings[key]"
                                    class="text-field"
                                    :class="{ invalid: !validState[key] }"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </ClientOnly>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import IconButton from "./IconButton.vue";
import { useLocalStorage } from "@vueuse/core";
import { mapObject } from "../util/mapObject.js";
import { onClickOutside } from "@vueuse/core";

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

const names = {
    translationPrecision: "Absolute/relative point translation precision",
    resizePrecision: "Resize precision",
    linePointPosPrecision: "Line point pos precision",
    linePointDistancePrecision: "Line point distance precision",
    axisAlignedPosPrecision: "Axis aligned pos precision",
    rotationPrecision: "Rotation precision"
};

const settings = useLocalStorage<Partial<Record<keyof typeof names, number>>>("languageServerSettings", {});

const validState = ref(mapObject(names, () => true));
const cachedStringifiedSettings = ref(mapObject(names, (key) => settings.value[key]?.toString() ?? ""));

watch(
    cachedStringifiedSettings,
    (newValue) => {
        for (const key in names) {
            const typedKey = key as keyof typeof names;
            updateAndValidate(typedKey, newValue[typedKey]);
        }
    },
    { deep: true }
);

function updateAndValidate(key: keyof typeof names, value: string) {
    const currentValue = settings.value[key];
    const newValue = value.replaceAll(/[^0-9.]/g, "");
    cachedStringifiedSettings.value[key] = newValue;

    if (newValue === "") {
        validState.value[key] = true;
        settings.value[key] = undefined;
    } else {
        const parsedNewValue = Number(newValue);
        const isValid = !Number.isNaN(parsedNewValue);
        validState.value[key] = isValid;
        if (isValid && currentValue !== parsedNewValue) {
            settings.value[key] = parsedNewValue;
        }
    }
}
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
    align-items: center;
    justify-content: center;
    background: var(--vp-backdrop-bg-color);
    transition: opacity 0.5s;
}

.modal-container {
    max-width: min(calc(100% - 40px), 400px);
    margin: auto;
    padding: 30px;
    padding-top: 25px;
    background-color: var(--vp-c-bg);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 25px;
}

.subtitle {
    font-size: 16px;
    margin-top: 15px;
    margin-bottom: 8px;
}

.text-field {
    background-color: var(--vp-c-bg-alt);
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 4px 12px;
    width: 100%;
}

.text-field:hover,
.text-field:focus {
    border-color: var(--vp-c-brand);
}

.text-field.invalid {
    border-color: var(--vp-c-danger-1);
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
