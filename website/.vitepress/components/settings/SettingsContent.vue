<template>
    <p class="title">Settings</p>
    <SettingsTabs v-model="tab" :tabs="tabs">
        <div class="content">
            <template v-if="tab == 'graphical-editor'">
                <div v-for="(name, key) in graphicalEditorNames" :key="key">
                    <SettingsItem :subtitle="name">
                        <NumberInput v-model="languageServerConfig.settings.value[key]" />
                    </SettingsItem>
                </div>
            </template>
            <template v-else-if="tab == 'theme'">
                <div v-for="(name, key) in themeNames" :key="key">
                    <SettingsItem :subtitle="name">
                        <ColorInput v-model="languageServerConfig.diagramConfig.value[key]" />
                    </SettingsItem>
                </div>
            </template>
        </div>
    </SettingsTabs>
</template>
<script setup lang="ts">
import SettingsItem from "./SettingsItem.vue";
import { inject, ref } from "vue";
import SettingsTabs from "./SettingsTabs.vue";
import NumberInput from "./NumberInput.vue";
import { languageServerConfigKey } from "../../theme/injectionKeys";
import ColorInput from "./ColorInput.vue";

const graphicalEditorNames = {
    translationPrecision: "Absolute/relative point translation precision",
    resizePrecision: "Resize precision",
    linePointPosPrecision: "Line point pos precision",
    linePointDistancePrecision: "Line point distance precision",
    axisAlignedPosPrecision: "Axis aligned pos precision",
    rotationPrecision: "Rotation precision"
};

const themeNames = {
    lightPrimaryColor: "Light mode primary color",
    lightBackgroundColor: "Light mode background color",
    darkPrimaryColor: "Dark mode primary color",
    darkBackgroundColor: "Dark mode background color"
};

const languageServerConfig = inject(languageServerConfigKey)!;

const tabs = [
    { name: "Graphical editor", id: "graphical-editor" },
    { name: "Theme", id: "theme" }
];
const tab = ref("graphical-editor");
</script>
<style scoped>
.title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 15px;
    margin-top: 25px;
}

.title,
.content {
    margin-left: 30px;
    margin-right: 30px;
}

.content {
    margin-bottom: 30px;
    margin-top: 25px;
}
</style>
