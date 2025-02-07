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
            <Teleport v-if="codeWithFileHandle == undefined" to="#diagram-filename">
                <DiagramChooser
                    v-model="filename"
                    :all-diagrams="localStorageDiagrams"
                    @change-diagram-content="openLocalStorageDiagram"
                    @delete-diagram="deleteDiagram"
                ></DiagramChooser>
            </Teleport>
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
import { onKeyStroke, useEventListener, useLocalStorage, useWindowSize } from "@vueuse/core";
import { defineClientComponent, useData } from "vitepress";
import IconButton from "./IconButton.vue";
import VPFlyout from "vitepress/dist/client/theme-default/components/VPFlyout.vue";
import { Root } from "@hylimo/diagram-common";
import { computed, inject, onBeforeMount, ref, UnwrapRef } from "vue";
import { SVGRenderer } from "@hylimo/diagram-render-svg";
import { PDFRenderer } from "@hylimo/diagram-render-pdf";
import fileSaver from "file-saver";
import { deserialize, serialize } from "../util/serialization.js";
import RegisterSW from "./RegisterSW.vue";
import { CodeWithFileHandle, openDiagram } from "../util/diagramOpener";
import { languageServerConfigKey } from "../theme/injectionKeys";
import DiagramChooser from "./settings/DiagramChooser.vue";

const HylimoEditor = defineClientComponent(() => import("./HylimoEditor.vue"));

const { isDark, site } = useData();
const { width, height } = useWindowSize();
const languageServerConfig = inject(languageServerConfigKey)!;

/**
 * The current version of the diagram serialization algorithm.
 */
const serializationVersion = 1;

/**
 * @param filename the filename without extension (i.e. `diagram` for the resulting file `diagram.hyl`)
 * @param version the serialization mechanism of the diagram, currently always `1`
 */
class DiagramMetadata {
    filename: string;
    version: number;
    lastChange: Date;

    constructor(filename: string, version: number, lastChange: string) {
        this.filename = filename;
        this.version = version;
        this.lastChange = new Date(lastChange);
    }

    toString(): string {
        return `diagram ${this.filename} (last edited ${this.lastChange})`;
    }
}

export type DiagramsMetadata = DiagramMetadata[];

const localStorageAvailableDiagrams = useLocalStorage<DiagramsMetadata>("available-diagrams", [], {listenToStorageChanges: true});

const defaultDiagram =
    'classDiagram {\n    class("HelloWorld") {\n        public {\n            hello : string\n        }\n    }\n}';

const filename = ref<string>("diagram");

const fileCode = ref<string>();
const codeWithFileHandle = ref<CodeWithFileHandle>();
const hasFileCodeChanges = computed(
    () => fileCode.value != undefined && fileCode.value != codeWithFileHandle.value?.code
);

const localStorageCode = ref<string>("");
const localStorageDiagrams = ref<DiagramsMetadata>([]);

const code = computed({
    get: () => fileCode.value ?? localStorageCode.value,
    set: (value: string) => {
        if (codeWithFileHandle.value != undefined) {
            fileCode.value = value;
        } else {
            saveToLocalStorage(value);
        }
    }
});

function openMostRecentLocalstorageDiagram() {
    if (localStorageDiagrams.value.length == 0) {
        localStorageCode.value = defaultDiagram;
        return;
    }

    const diagram = localStorageDiagrams.value[0];
    loadLocalStorageDiagram(diagram.filename, diagram.version);
    filename.value = diagram.filename;
}

/**
 * Opens the given diagram from local storage.
 *
 * @param diagram the diagram name to load
 */
function openLocalStorageDiagram(diagram: string) {
    const diagrams = localStorageDiagrams.value;

    const expectedDiagrams = diagrams.filter((d) => d.filename === diagram);
    if (expectedDiagrams.length == 0) {
        console.error(`diagram ${diagram} was not found. Possible options: ${diagrams}`);
        return;
    }
    const newDiagram = expectedDiagrams[0];

    loadLocalStorageDiagram(newDiagram.filename, newDiagram.version);
    filename.value = newDiagram.filename;
}

/**
 * Saves the current diagram to local storage.
 *
 * @param value the text of the current diagram
 */
function saveToLocalStorage(value: string) {
    const diagrams = localStorageDiagrams.value;

    let diagramMetadata = diagrams.find((d) => d.filename === filename.value);
    if (diagramMetadata == undefined) {
        diagramMetadata = { filename: filename.value, version: serializationVersion, lastChange: new Date() };
        diagrams.unshift(diagramMetadata);
    } else {
        diagramMetadata.lastChange = new Date();
    }

    saveMetadata(diagrams);
    saveCurrentDiagram(filename.value, diagramMetadata.version, value);
}

function saveMetadata(diagrams: DiagramsMetadata) {
    localStorageAvailableDiagrams.value = diagrams;
}

/**
 * Serializes the given diagram with the given serialization algorithm into localstorage.<br>
 * Inverse of {@link loadLocalStorageDiagram}.
 *
 * @param filename the diagram name
 * @param serializationVersion the serialization algorithm to use. Currently always {@link serializationVersion}
 * @param diagramText the diagram source code to serialize
 */
function saveCurrentDiagram(filename: UnwrapRef<string>, serializationVersion: number, diagramText: string) {
    if (serializationVersion != 1) {
        throw new Error(`Unsupported diagram version: ${serializationVersion}. Cannot serialize diagram '${filename}'`);
    }
    window.localStorage.setItem(`diagram-v1-${filename}`, diagramText);
}

/**
 * Loads the given diagram from the local storage using the given serialization algorithm.<br>
 * Inverse of {@link saveCurrentDiagram}.
 *
 * @param filename the diagram to load
 * @param version the Hylimo serialization algorithm version that was used to serialize the diagram. Currently always set to {@link serializationVersion}.
 */
function loadLocalStorageDiagram(filename: string, version: number) {
    if (version != 1) {
        throw new Error(`Unsupported diagram version: ${version}. Cannot deserialize diagram '${filename}'`);
    }
    const diagram = window.localStorage.getItem(`diagram-v1-${filename}`);
    if (diagram) {
        localStorageCode.value = diagram;
        console.log(`successfully loaded diagram ${filename}`);
    }
}

function deleteDiagram(filename: string) {
    const deletedDiagram = localStorageDiagrams.value.find((d) => d.filename === filename);
    localStorageDiagrams.value = localStorageDiagrams.value.filter((diagram) => diagram.filename !== filename);
    saveMetadata(localStorageDiagrams.value);
    if (deletedDiagram) {
        deleteDiagramText(deletedDiagram.filename, deletedDiagram.version);
    }
}

function deleteDiagramText(filename: string, version: number) {
    if(version != 1) {
        throw new Error(`Unsupported diagram version: ${version}. Cannot delete diagram '${filename}'`);
    }
    window.localStorage.removeItem(`diagram-v1-${filename}`);
}

const baseName = computed(
    () => codeWithFileHandle.value?.fileHandle?.name?.match(/^(.*?)(\.hyl)?$/)?.[1] ?? filename.value
);
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

onKeyStroke("E", (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
        return;
    }
    event.preventDefault();
    downloadSVG(false);
});

function downloadSVG(textAsPath: boolean) {
    const svgBlob = new Blob([svgRenderer.render(diagram.value!, textAsPath)], { type: "image/svg+xml;charset=utf-8" });
    fileSaver.saveAs(svgBlob, baseName.value + ".svg");
}

async function downloadPDF() {
    const config = languageServerConfig.diagramConfig.value;
    const pdf = await pdfRenderer.render(
        diagram.value!,
        isDark.value ? config.darkBackgroundColor : config.lightBackgroundColor
    );
    fileSaver.saveAs(new Blob(pdf, { type: "application/pdf" }), baseName.value + ".pdf");
}

function downloadSource() {
    fileSaver.saveAs(new Blob([code.value]), baseName.value + ".hyl");
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
        let useLocalStorage = true;
        openDiagram()
            .then((diagram) => {
                if (diagram != undefined) {
                    useLocalStorage = false;
                    codeWithFileHandle.value = diagram;
                    fileCode.value = diagram.code;
                }
            })
            .catch((e) => {
                // eslint-disable-next-line no-console
                console.error("Failed to open diagram", e);
            });
        if (useLocalStorage) {
            openMostRecentLocalstorageDiagram();
        }
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

.VPNavBarSearch {
    display: none;
}
</style>
