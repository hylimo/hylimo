<template>
    <div class="main">
        <VPNav class="navbar" />
        <RegisterSW />
        <HylimoEditor
            v-model="code"
            :horizontal="height > width && width < 800"
            @update:diagram="diagram = $event"
            class="main-content"
        />
        <ClientOnly>
            <Teleport to="#copy-diagram-link">
                <IconButton label="Copy diagram link" icon="vpi-link" @click="copyLink" />
                <span class="tooltip" :class="{ active: copiedSuccess }">Copied!</span>
            </Teleport>
            <Teleport v-if="codeWithFileHandle != undefined" to="#save-diagram">
                <IconButton label="Save diagram" icon="vpi-save" @click="saveFile" :disabled="!hasFileCodeChanges" />
                <span class="tooltip" :class="{ active: savedSuccess }">Saved</span>
            </Teleport>
            <Teleport to="#export-diagram">
                <VPFlyout icon="vpi-download" label="Download diagram" class="download-flyout">
                    <button class="menu-button" :disabled="diagram == undefined" @click="downloadSVG">SVG</button>
                    <button class="menu-button" :disabled="diagram == undefined" @click="downloadPDF">PDF</button>
                    <button class="menu-button" @click="downloadSource">Source</button>
                </VPFlyout>
            </Teleport>
        </ClientOnly>
    </div>
</template>
<script setup lang="ts">
import VPNav from "vitepress/dist/client/theme-default/components/VPNav.vue";
import { useLocalStorage, onKeyStroke, useWindowSize, useEventListener } from "@vueuse/core";
import { defineClientComponent, useData } from "vitepress";
import IconButton from "./IconButton.vue";
import VPFlyout from "vitepress/dist/client/theme-default/components/VPFlyout.vue";
import { Root } from "@hylimo/diagram-common";
import { computed, inject, ref } from "vue";
import { SVGRenderer } from "@hylimo/diagram-render-svg";
import { PDFRenderer } from "@hylimo/diagram-render-pdf";
import fileSaver from "file-saver";
import { serialize, deserialize } from "../util/serialization.js";
import { onBeforeMount } from "vue";
import RegisterSW from "./RegisterSW.vue";
import { CodeWithFileHandle, openDiagram } from "../util/diagramOpener";
import { languageServerConfigKey } from "../theme/lspPlugin";

const HylimoEditor = defineClientComponent(() => import("./HylimoEditor.vue"));

const { isDark, site } = useData();
const { width, height } = useWindowSize();
const languageServerConfig = inject(languageServerConfigKey)!;

const localStorageCode = useLocalStorage(
    "code",
    'classDiagram {\n    class("HelloWorld") {\n        public {\n            hello : string\n        }\n    }\n}'
);
const fileCode = ref<string>();
const codeWithFileHandle = ref<CodeWithFileHandle>();
const hasFileCodeChanges = computed(
    () => fileCode.value != undefined && fileCode.value != codeWithFileHandle.value?.code
);
const code = computed({
    get: () => fileCode.value ?? localStorageCode.value,
    set: (value: string) => {
        if (codeWithFileHandle.value != undefined) {
            fileCode.value = value;
        } else {
            localStorageCode.value = value;
        }
    }
});
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
    if (codeWithFileHandle.value != undefined) {
        saveFile();
    } else {
        downloadSource();
    }
});

function downloadSVG() {
    const svgBlob = new Blob([svgRenderer.render(diagram.value!)], { type: "image/svg+xml;charset=utf-8" });
    fileSaver.saveAs(svgBlob, "diagram.svg");
}

async function downloadPDF() {
    const config = languageServerConfig.diagramConfig.value;
    const pdf = await pdfRenderer.render(
        diagram.value!,
        isDark.value ? config.darkBackgroundColor : config.lightBackgroundColor
    );
    fileSaver.saveAs(new Blob(pdf, { type: "application/pdf" }), "diagram.pdf");
}

function downloadSource() {
    fileSaver.saveAs(new Blob([code.value]), "diagram.hyl");
}

async function saveFile() {
    const fileHandle = codeWithFileHandle.value?.fileHandle;
    if (fileHandle == undefined) {
        throw new Error("No file handle");
    }
    const writable = await fileHandle.createWritable();
    await writable.write(code.value);
    await writable.close();
    codeWithFileHandle.value!.code = code.value;
    savedSuccess.value = true;
    setTimeout(() => {
        savedSuccess.value = false;
    }, successMessageTimeout);
}

function copyLink() {
    const data = serialize(code.value, "pako");
    const url = new URL(site.value.base, window.location.href);
    navigator.clipboard.writeText(url.toString() + "#" + data);
    copiedSuccess.value = true;
    setTimeout(() => {
        copiedSuccess.value = false;
    }, successMessageTimeout);
}

onBeforeMount(() => {
    const hash = window.location.hash;
    if (hash) {
        try {
            code.value = deserialize(hash.substring(1));
            history.replaceState(null, "", window.location.pathname);
        } catch (e) {
            console.warn("Failed to deserialize diagram from URL", e);
        }
    } else {
        openDiagram()
            .then((diagram) => {
                if (diagram != undefined) {
                    codeWithFileHandle.value = diagram;
                    fileCode.value = diagram.code;
                }
            })
            .catch((e) => {
                // eslint-disable-next-line no-console
                console.error("Failed to open diagram", e);
            });
    }
    useEventListener(window, "beforeunload", (event) => {
        if (hasFileCodeChanges.value) {
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
    color: var(--vp-c-brand-1);
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
