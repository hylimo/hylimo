<template>
    <div class="diagram-chooser" ref="diagramChooser">
        <input
            v-model="inputFilenameOrPlaceholder"
            ref="diagramSelect"
            class="diagram-select"
            :class="{ untitled: !showDialog && !inputFilename }"
            :placeholder="diagramSource != undefined ? 'Search or create diagram' : undefined"
            :readonly="readonly"
            :title="diagramSource?.canSave?.value ? 'Unsaved changes' : undefined"
            @focus="
                if (!readonly) {
                    ($event.target as HTMLInputElement).select();
                }
                openDialog();
            "
            @click="openDialog"
            @input="openDialog"
        />
        <span
            class="select-icon"
            :class="{
                'vpi-file-stack-light': diagramSource?.type === 'browser',
                'vpi-file-check-light': diagramSource?.type === 'file' && !diagramSource?.canSave?.value,
                'vpi-file-warning-light': diagramSource?.type === 'file' && diagramSource?.canSave?.value,
                'vpi-cloud-check-light': diagramSource?.type === 'embedded' && !diagramSource?.canSave?.value,
                'vpi-cloud-warning-light': diagramSource?.type === 'embedded' && diagramSource?.canSave?.value
            }"
        />
        <Transition name="dialog">
            <div v-show="showDialog && diagramEntries.length > 0" class="dialog" @mousemove="onMouseMove">
                <div
                    v-for="(diagram, index) in diagramEntries"
                    :key="diagram.filename"
                    class="item"
                    :class="{
                        selected: index === selectedIndex,
                        current: diagram.filename === diagramSource?.filename && diagram.type === diagramSource?.type
                    }"
                    :data-index="index"
                    @mouseenter="!disableMouseOver && (selectedIndex = index)"
                    @focusin="selectedIndex = index"
                    @click="selectDiagram(diagram)"
                >
                    <template v-if="diagram.type === 'new'">
                        <span class="filename"
                            >Create new: <span class="available-diagram-filename">{{ diagram.filename }}</span></span
                        >
                        <div class="icon">
                            <span class="vpi-plus" />
                        </div>
                    </template>
                    <template v-else-if="diagram.type === 'file'">
                        <span class="filename">{{ diagram.filename }}</span>
                        <div class="icon">
                            <span class="vpi-file" />
                        </div>
                    </template>
                    <template v-else-if="diagram.type === 'open-file'">
                        <span class="filename">Open file...</span>
                        <div class="icon">
                            <span class="vpi-folder-open" />
                        </div>
                    </template>
                    <template v-else>
                        <span class="filename">{{ diagram.filename }}</span>
                        <span class="info">
                            last edited
                            <relative-time :datetime="diagram.lastChange" />
                        </span>
                        <button class="delete-button icon" @click.stop="deleteDiagram(diagram)">
                            <span class="vpi-trashcan" />
                        </button>
                    </template>
                </div>
            </div>
        </Transition>
    </div>
</template>
<script setup lang="ts">
import { computed, markRaw, nextTick, ref, watch, type PropType } from "vue";
import { onClickOutside, onKeyStroke, watchImmediate } from "@vueuse/core";
import "@github/relative-time-element";
import MiniSearch, { type SearchResult } from "minisearch";
import type { DiagramMetadata } from "../util/diagramStorageSource";
import type { DiagramSource } from "../util/diagramSource";

interface DiagramEntry extends DiagramMetadata {
    type: "file" | "open-file" | "new" | "browser";
}

const props = defineProps({
    diagramSource: {
        type: Object as PropType<DiagramSource>,
        required: false
    },
    allDiagrams: {
        type: Array as PropType<DiagramMetadata[]>,
        required: true
    }
});

const emit = defineEmits<{
    openDiagram: [value: string];
    openFile: [];
    deleteDiagram: [value: string];
    createDiagram: [value: string];
}>();

const inputFilename = ref("");

watchImmediate(
    () => props.diagramSource,
    (source) => {
        inputFilename.value = source?.filename ?? "";
    }
);

const showDialog = ref(false);
const disableMouseOver = ref(true);
const didInputChange = ref(false);
const selectedIndex = ref(-1);
const diagramChooser = ref<HTMLElement | null>(null);
const diagramSelect = ref<HTMLInputElement | null>(null);
const diagramEntries = ref<DiagramEntry[]>([]);

const readonly = computed(() => props.diagramSource?.type === "embedded");

const inputFilenameOrPlaceholder = computed({
    get: () => {
        if (props.diagramSource == undefined) {
            return "";
        } else if (showDialog.value) {
            return inputFilename.value;
        } else {
            return inputFilename.value || "Untitled diagram";
        }
    },
    set: (value) => {
        openDialog();
        didInputChange.value = true;
        inputFilename.value = value;
    }
});

const searchIndex = computed(() => {
    const index = new MiniSearch<DiagramEntry>({
        fields: ["filename"],
        storeFields: ["filename", "lastChange", "type"],
        idField: "filename",
        searchOptions: {
            prefix: true,
            fuzzy: 0.2
        }
    });
    index.addAll(props.allDiagrams.map((diagram) => ({ ...diagram, type: "browser" }) as const));
    if (props.diagramSource?.type === "file") {
        index.add({
            filename: props.diagramSource.filename,
            lastChange: new Date().toISOString(),
            type: "file"
        });
    }
    return markRaw(index);
});

function computDefaultDiagramEntries(): DiagramEntry[] {
    const entries: DiagramEntry[] = [...props.allDiagrams.map((diagram) => ({ ...diagram, type: "browser" }) as const)];
    if (props.diagramSource?.type === "file") {
        entries.unshift({
            filename: props.diagramSource.filename,
            lastChange: new Date().toISOString(),
            type: "file"
        });
    }
    if ("showOpenFilePicker" in window) {
        entries.unshift({ filename: "", type: "open-file", lastChange: new Date().toISOString() });
    }
    return entries;
}

function updateDiagramEntries(): void {
    const name = inputFilename.value;
    if (name.length === 0 || !didInputChange.value) {
        diagramEntries.value = computDefaultDiagramEntries();
        return;
    }
    const searchResults = searchIndex.value.search(name) as (DiagramEntry & SearchResult)[];
    const newResults: DiagramEntry[] = [];
    if (props.allDiagrams.every((d) => d.filename !== name)) {
        newResults.push({ filename: name, type: "new", lastChange: new Date().toISOString() });
    }
    newResults.push(...searchResults);
    diagramEntries.value = newResults;
}

watch([inputFilename, () => props.allDiagrams], () => {
    if (showDialog.value) {
        updateDiagramEntries();
    }
});

function openDialog(): void {
    if (showDialog.value || readonly.value) {
        return;
    }
    updateDiagramEntries();
    showDialog.value = true;
}

function closeDialog(): void {
    showDialog.value = false;
    diagramSelect?.value?.blur();
    inputFilename.value = props.diagramSource?.filename ?? "";
    didInputChange.value = false;
}

function selectDiagram(diagram: DiagramEntry): void {
    if (diagram.type === "file") {
        closeDialog();
        return;
    }
    if (props.diagramSource?.canSave?.value) {
        const confirmed = window.confirm(`Discard changes to '${props.diagramSource.filename}'?`);
        if (!confirmed) {
            closeDialog();
            return;
        }
    }
    if (diagram.type === "new") {
        emit("createDiagram", diagram.filename);
    } else if (diagram.type === "open-file") {
        emit("openFile");
    } else if (diagram.type === "browser") {
        emit("openDiagram", diagram.filename);
    }
    closeDialog();
}

function deleteDiagram(diagram: DiagramEntry): void {
    const confirmed = window.confirm(`Are you sure you want to delete diagram '${diagram.filename}'?`);
    if (confirmed) {
        emit("deleteDiagram", diagram.filename);
    }
}

onClickOutside(diagramChooser, () => {
    closeDialog();
});

watch(diagramEntries, (r) => {
    selectedIndex.value = r.length ? 0 : -1;
    scrollToSelectedResult();
});

function scrollToSelectedResult() {
    nextTick(() => {
        const selectedEl = document.querySelector(".result.selected");
        selectedEl?.scrollIntoView({ block: "nearest" });
    });
}

onKeyStroke("ArrowUp", (event) => {
    if (!showDialog.value) {
        return;
    }
    event.preventDefault();
    selectedIndex.value--;
    if (selectedIndex.value < 0) {
        selectedIndex.value = diagramEntries.value.length - 1;
    }
    disableMouseOver.value = true;
    scrollToSelectedResult();
});

onKeyStroke("ArrowDown", (event) => {
    if (!showDialog.value) {
        return;
    }
    event.preventDefault();
    selectedIndex.value++;
    if (selectedIndex.value >= diagramEntries.value.length) {
        selectedIndex.value = 0;
    }
    disableMouseOver.value = true;
    scrollToSelectedResult();
});

onKeyStroke("Enter", (e) => {
    if (!showDialog.value || e.isComposing || (e.target instanceof HTMLButtonElement && e.target.type !== "submit")) {
        return;
    }

    const selectedDiagram = diagramEntries.value[selectedIndex.value];
    if (e.target instanceof HTMLInputElement && !selectedDiagram) {
        e.preventDefault();
        return;
    }

    if (selectedDiagram != undefined) {
        selectDiagram(selectedDiagram);
    }
});

onKeyStroke("Escape", () => {
    closeDialog();
});

function onMouseMove(e: MouseEvent) {
    if (!disableMouseOver.value || !showDialog.value) {
        return;
    }
    const el = (e.target as HTMLElement)?.closest<HTMLAnchorElement>(".item");
    const index = Number.parseInt(el?.dataset.index!);
    if (index >= 0 && index !== selectedIndex.value) {
        selectedIndex.value = index;
    }
    disableMouseOver.value = false;
}
</script>
<style scoped>
.diagram-chooser {
    margin-left: 10px;
    position: relative;
    flex: 0 1 30ch;
}

@media (max-width: 500px) {
    .diagram-chooser:not(.screen-menu) {
        display: none;
    }
}

.diagram-select {
    border-radius: 6px;
    padding: 2px 12px 2px 28px;
    height: 40px;
    width: 100%;
    flex-shrink: 1;
    box-sizing: border-box;
    background-color: var(--vp-c-bg-alt);
    border: 1px solid transparent;
    font-size: 13px;
    font-family: var(--vp-font-family-base);
    font-weight: 500;
}

.diagram-select:hover:not(:disabled),
.diagram-select:focus:not(:disabled) {
    border-color: var(--vp-c-brand-1);
}

.diagram-select.untitled {
    font-style: italic;
}

.select-icon {
    position: absolute;
    left: 4px;
    top: 0;
    bottom: 0;
    margin: auto;
    width: 20px;
    height: 20px;
    pointer-events: none;
    color: var(--vp-c-text-2);
}

.select-icon.vpi-file-light {
    width: 16px;
    height: 16px;
}

.available-diagram-filename {
    font-style: italic;
}

.dialog {
    position: absolute;
    top: calc(var(--vp-nav-height) - 6px);
    left: 0;
    transition:
        opacity 0.25s,
        visibility 0.25s;
    opacity: 1;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid var(--vp-c-divider);
    background-color: var(--vp-c-bg-elv);
    box-shadow: var(--vp-shadow-3);
    width: min(75vw, 500px);
    max-height: calc(80vh - var(--vp-nav-height));
    overflow-y: auto;
}

.dialog-enter-from,
.dialog-leave-to {
    opacity: 0;
}

.item {
    font-size: 14px;
    padding-left: 12px;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    box-sizing: border-box;
}

.filename {
    font-weight: 500;
    flex: 1 1 0;
    margin-right: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.info {
    font-size: 12px;
    color: var(--vp-c-text-2);
}

.item.current {
    background-color: var(--vp-c-default-soft);

    .filename {
        color: var(--vp-c-brand-1);
    }
}

.item.selected {
    border-color: var(--vp-c-brand-1);
}

.icon {
    height: 36px;
    width: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--vp-c-text-1);

    span {
        width: 16px;
        height: 16px;
    }
}

.delete-button:hover {
    color: var(--vp-c-danger-1);
    transition: color 0.25s;
}
</style>
