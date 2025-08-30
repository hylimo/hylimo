<template>
    <p class="title">Settings</p>
    <SettingsTabs v-model="tab" :tabs="tabs" class="settings-tabs">
        <div class="content">
            <template v-if="tab == 'graphical-editor'">
                <NumberInputItem
                    subtitle="Absolute/relative point translation precision"
                    v-model="settings.translationPrecision"
                    :default-value="defaultSharedSettings.translationPrecision"
                />
                <NumberInputItem
                    subtitle="Resize precision"
                    v-model="settings.resizePrecision"
                    :default-value="defaultSharedSettings.resizePrecision"
                />
                <NumberInputItem
                    subtitle="Line point pos precision"
                    v-model="settings.linePointPosPrecision"
                    :default-value="defaultSharedSettings.linePointPosPrecision"
                />
                <NumberInputItem
                    subtitle="Line point distance precision"
                    v-model="settings.linePointDistancePrecision"
                    :default-value="defaultSharedSettings.linePointDistancePrecision"
                />
                <NumberInputItem
                    subtitle="Axis aligned pos precision"
                    v-model="settings.axisAlignedPosPrecision"
                    :default-value="defaultSharedSettings.axisAlignedPosPrecision"
                />
                <NumberInputItem
                    subtitle="Rotation precision"
                    v-model="settings.rotationPrecision"
                    :default-value="defaultSharedSettings.rotationPrecision"
                />
                <BooleanInputItem subtitle="Grid" v-model="editorConfig.gridEnabled" />
                <BooleanInputItem subtitle="Snap to elements/points" v-model="editorConfig.snappingEnabled" />
            </template>
            <template v-else-if="tab == 'theme'">
                <ColorInputItem
                    subtitle="Light mode primary color"
                    v-model="diagramConfig.lightPrimaryColor"
                    :default-value="defaultDiagramConfig.lightPrimaryColor"
                />
                <ColorInputItem
                    subtitle="Light mode background color"
                    v-model="diagramConfig.lightBackgroundColor"
                    :default-value="defaultDiagramConfig.lightBackgroundColor"
                />
                <ColorInputItem
                    subtitle="Dark mode primary color"
                    v-model="diagramConfig.darkPrimaryColor"
                    :default-value="defaultDiagramConfig.darkPrimaryColor"
                />
                <ColorInputItem
                    subtitle="Dark mode background color"
                    v-model="diagramConfig.darkBackgroundColor"
                    :default-value="defaultDiagramConfig.darkBackgroundColor"
                />
            </template>
            <template v-else-if="tab == 'diagram'">
                <BooleanInputItem subtitle="Font subsetting" v-model="diagramConfig.enableFontSubsetting" />
                <BooleanInputItem subtitle="External fonts" v-model="diagramConfig.enableExternalFonts" />
            </template>
        </div>
    </SettingsTabs>
</template>
<script setup lang="ts">
import { inject, ref } from "vue";
import SettingsTabs from "./SettingsTabs.vue";
import { languageServerConfigKey } from "../../theme/injectionKeys";
import NumberInputItem from "./NumberInputItem.vue";
import ColorInputItem from "./ColorInputItem.vue";
import BooleanInputItem from "./BooleanInputItem.vue";
import { defaultDiagramConfig, defaultSharedSettings } from "../../theme/lspPlugin";

const languageServerConfig = inject(languageServerConfigKey)!;
const settings = languageServerConfig.settings;
const diagramConfig = languageServerConfig.diagramConfig;
const editorConfig = languageServerConfig.editorConfig;

const tabs = [
    { name: "Graphical editor", id: "graphical-editor" },
    { name: "Theme", id: "theme" },
    { name: "Diagram", id: "diagram" }
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

.settings-tabs :deep(.tabs) {
    margin-right: 0;
    margin-left: 0;
    border-radius: 8px 8px 0 0;
    flex-shrink: 0;
}

.settings-tabs {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.content {
    margin-bottom: 30px;
    margin-top: 25px;
    overflow-y: auto;
    display: grid;
    row-gap: 15px;
}
</style>
