<template>
    <div class="main">
        <VPNav class="navbar" />
        <RegisterSW />
        <HylimoEditor
            v-if="diagramSource != undefined"
            v-model="diagramSource.code.value"
            :horizontal="height > width && width < 800"
            @update:diagram="diagram = $event"
            @save="save"
            class="main-content"
        />
        <ClientOnly>
            <Teleport to="#diagram-select">
                <DiagramChooser
                    :diagram-source="diagramSource"
                    :all-diagrams="allDiagrams"
                    @open-diagram="openDiagram($event).then((diagram) => (diagramSource = diagram))"
                    @open-file="openFile()"
                    @create-diagram="createDiagram($event, diagramSource?.code.value ?? defaultDiagram)"
                    @delete-diagram="deleteDiagram"
                ></DiagramChooser>
            </Teleport>
            <Teleport to="#copy-diagram-link">
                <IconButton label="Copy diagram link" icon="vpi-link" @click="copyLink" />
                <span class="tooltip" :class="{ active: copiedSuccess }">Copied!</span>
            </Teleport>
            <Teleport v-if="diagramSource?.canSave?.value != undefined" to="#save-diagram">
                <IconButton
                    label="Save diagram"
                    icon="vpi-save"
                    @click="saveDiagram"
                    :disabled="!diagramSource.canSave.value"
                />
                <span class="tooltip" :class="{ active: savedSuccess }">Saved</span>
            </Teleport>
            <Teleport to="#export-diagram">
                <VPFlyout icon="vpi-download" label="Download diagram" class="download-flyout">
                    <button class="menu-button" :disabled="diagram == undefined" @click="downloadSVG(false)">
                        SVG
                    </button>
                    <button class="menu-button" :disabled="diagram == undefined" @click="downloadSVG(true)">
                        SVG (text as path)
                    </button>
                    <button class="menu-button" :disabled="diagram == undefined" @click="downloadPDF">PDF</button>
                    <button class="menu-button" @click="downloadSource">Source</button>
                </VPFlyout>
            </Teleport>
        </ClientOnly>
    </div>
</template>
<script setup lang="ts">
import VPNav from "vitepress/dist/client/theme-default/components/VPNav.vue";
import { onKeyStroke, useEventListener, useWindowSize } from "@vueuse/core";
import { defineClientComponent, useData } from "vitepress";
import IconButton from "./IconButton.vue";
import VPFlyout from "vitepress/dist/client/theme-default/components/VPFlyout.vue";
import { Root } from "@hylimo/diagram-common";
import { computed, inject, onBeforeMount, ref, shallowRef } from "vue";
import { SVGRenderer } from "@hylimo/diagram-render-svg";
import { PDFRenderer } from "@hylimo/diagram-render-pdf";
import fileSaver from "file-saver";
import { deserialize, serialize } from "../util/serialization.js";
import RegisterSW from "./RegisterSW.vue";
import { openDiagramFromFile, openDiagramFromLaunchQueue } from "../util/diagramFileSource";
import { languageServerConfigKey } from "../theme/injectionKeys";
import DiagramChooser from "./DiagramChooser.vue";
import { useDiagramStorage } from "../util/diagramStorageSource";
import type { DiagramSource } from "../util/diagramSource";

const HylimoEditor = defineClientComponent(() => import("./HylimoEditor.vue"));

const { isDark, site } = useData();
const { width, height } = useWindowSize();
const languageServerConfig = inject(languageServerConfigKey)!;

const diagramSource = shallowRef<DiagramSource>();

const fileBaseName = computed(() => diagramSource.value?.baseName || "diagram");

const { diagrams, addDiagram, removeDiagram, openDiagram, initialized } = useDiagramStorage();

const allDiagrams = computed(() => {
    return Object.values(diagrams.value)
        .filter((diagram) => diagram.filename != "")
        .sort((a, b) => new Date(b.lastChange).getTime() - new Date(a.lastChange).getTime());
});

const defaultDiagram =
    'classDiagram {\n    class("HelloWorld") {\n        public {\n            hello : string\n        }\n    }\n}';

async function createDiagram(name: string, code: string) {
    await addDiagram(name, code);
    diagramSource.value = await openDiagram(name);
}

async function openFile() {
    const newSource = await openDiagramFromFile();
    if (newSource != undefined) {
        diagramSource.value = newSource;
    }
}

async function deleteDiagram(name: string) {
    const deletedDiagram = diagrams.value[name];
    if (deletedDiagram != undefined) {
        await removeDiagram(name);
        if (name == diagramSource.value?.filename) {
            await createDiagram("", diagramSource.value.code.value);
        }
    }
}

async function openMostRecentDiagramFromStorage(): Promise<DiagramSource> {
    await initialized;
    const sortedDiagrams = allDiagrams.value;
    if (sortedDiagrams.length != 0) {
        const diagram = sortedDiagrams[0];
        return openDiagram(diagram.filename);
    } else {
        if (diagrams.value[""] == undefined) {
            await addDiagram("", defaultDiagram);
        }
        return openDiagram("");
    }
}

const diagram = ref<Root>();
const successMessageTimeout = 1000;
const copiedSuccess = ref(false);
const savedSuccess = ref(false);

const svgRenderer = new SVGRenderer();
const pdfRenderer = new PDFRenderer();

onKeyStroke("s", (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
        return;
    }
    event.preventDefault();
    save();
});

onKeyStroke("E", (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
        return;
    }
    event.preventDefault();
    downloadSVG(false);
});

function save() {
    if (diagramSource.value?.canSave?.value != undefined) {
        saveDiagram();
    } else {
        downloadSource();
    }
}

function downloadSVG(textAsPath: boolean) {
    const source = diagramSource.value;
    if (source == undefined) {
        return;
    }
    const svgBlob = new Blob([svgRenderer.render(diagram.value!, textAsPath)], { type: "image/svg+xml;charset=utf-8" });
    fileSaver.saveAs(svgBlob, fileBaseName.value + ".svg");
}

async function downloadPDF() {
    const source = diagramSource.value;
    if (source == undefined) {
        return;
    }
    const config = languageServerConfig.diagramConfig.value;
    const pdf = await pdfRenderer.render(
        diagram.value!,
        isDark.value ? config.darkBackgroundColor : config.lightBackgroundColor
    );
    fileSaver.saveAs(new Blob(pdf, { type: "application/pdf" }), fileBaseName.value + ".pdf");
}

function downloadSource() {
    const source = diagramSource.value;
    if (source == undefined) {
        return;
    }
    fileSaver.saveAs(new Blob([source.code.value]), fileBaseName.value + ".hyl");
}

async function saveDiagram() {
    await diagramSource.value?.save();
    savedSuccess.value = true;
    setTimeout(() => {
        savedSuccess.value = false;
    }, successMessageTimeout);
}

function copyLink() {
    const source = diagramSource.value;
    if (source == undefined) {
        return;
    }
    const data = serialize(source.code.value, "pako");
    const url = new URL(site.value.base, window.location.href);
    navigator.clipboard.writeText(url.toString() + "#" + data);
    copiedSuccess.value = true;
    setTimeout(() => {
        copiedSuccess.value = false;
    }, successMessageTimeout);
}

async function openDiagramBeforeMount(): Promise<void> {
    const hash = window.location.hash;
    if (hash) {
        await createDiagram("", deserialize(hash.substring(1)));
        history.replaceState(null, "", window.location.pathname);
    } else {
        const diagram = await openMostRecentDiagramFromStorage();
        diagramSource.value = diagram;
        const launchDiagram = await openDiagramFromLaunchQueue();
        if (launchDiagram != undefined) {
            diagramSource.value = launchDiagram;
        }
    }
}

onBeforeMount(() => {
    openDiagramBeforeMount();
    useEventListener(window, "beforeunload", (event) => {
        if (diagramSource.value?.canSave.value) {
            event.preventDefault();
        }
    });
});
</script>
<style scoped>
.main {
    height: 100svh;
    display: flex;
    flex-direction: column;
}

.navbar {
    position: relative;
}

.navbar :deep(.VPNavBarSearch) {
    display: none;
}

.main-content {
    width: 100%;
    flex-grow: 1;
    overflow: hidden;
}

.menu-button {
    display: block;
    width: 100%;
    text-align: left;
    border-radius: 6px;
    padding: 0 12px;
    line-height: 32px;
    font-size: 14px;
    font-weight: 500;
    color: var(--vp-c-text-1);
    transition:
        background-color 0.25s,
        color 0.25s;
}

.menu-button:hover {
    color: var(--vp-c-brand-1-1);
    background-color: var(--vp-c-default-soft);
}

.tooltip {
    display: block;
    position: absolute;
    top: 45px;
    left: -15px;
    font-size: 14px;
    transform: scale(0.9);
    color: var(--vp-c-text-1);
    border: 1px solid var(--vp-c-divider);
    background-color: var(--vp-c-bg-elv);
    box-shadow: var(--vp-shadow-3);
    padding: 8px 10px;
    border-radius: 8px;
    opacity: 0;
    pointer-events: none;
    transition: cubic-bezier(0.19, 1, 0.22, 1) 0.2s;
    transition-property: opacity, transform;
}

.tooltip.active {
    opacity: 1;
    transform: scale(1);
}

.download-flyout {
    margin-right: -4px;
}
</style>
<style>
body {
    height: 100svh;
    min-height: unset;
}
</style>
