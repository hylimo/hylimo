<template>
    <input v-model="filename" class="filename-input" :class="{ invalid: filename.length === 0 }" />
    <IconButton
        icon="vpi-chevron-up-down"
        label="Select another previously edited diagram"
        @click="openDialogue"
        class="change-diagram-button"
    />
    <ClientOnly>
        <Teleport to="body">
            <Transition name="modal">
                <div v-show="showDialog" class="modal-mask">
                    <div ref="dialog" class="modal-container">
                        <p class="title">Available diagrams</p>
                        <div class="content" v-for="diagram in allDiagrams" :key="diagram.filename">
                            <button @click="changeDiagramTo(diagram.filename)">
                                <span>{{ diagram.filename }}</span>
                                <span>last edited on {{ diagram.lastChange.toString() }}</span>
                            </button>
                            <IconButton
                                icon="vpi-trashcan"
                                :label="`Delete diagram '${diagram.filename}'`"
                                @click="deleteDiagram(diagram.filename)"
                            />
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </ClientOnly>
</template>
<script setup lang="ts">
import IconButton from "../IconButton.vue";
import type { DiagramsMetadata } from "../Home.vue";
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";

defineProps<{ allDiagrams: DiagramsMetadata }>();

const emit = defineEmits<{ (e: "changeDiagramContent", value: string): void, (e: "deleteDiagram", value: string): void }>();

const filename = defineModel({
    type: String,
    default: "diagram"
});

let showDialog = ref(false);
const dialog = ref<HTMLElement | null>(null);

function openDialogue(): void {
    showDialog.value = true;
}

function changeDiagramTo(newFilename: string): void {
    filename.value = newFilename;
    emit("changeDiagramContent", newFilename);
}

function deleteDiagram(diagram: string): void {
  const confirmed = window.confirm(`Are you sure you want to delete diagram '${diagram}'?`);
  if (confirmed) {
    emit("deleteDiagram", diagram);
  }
}

onClickOutside(dialog, () => {
    showDialog.value = false;
});
</script>
<style scoped>
.filename-input {
    background-color: var(--vp-c-bg);
    border-radius: 6px;
    padding: 2px 12px 2px 4px;
    max-height: 34px;
    max-width: 40ch;
    width: auto;
    flex-shrink: 1; /* Allow shrinking in flex containers */
    box-sizing: border-box; /* Ensure padding is included in width */
    min-width: 5ch;
}

.filename-input:hover,
.filename-input:focus {
    background-color: var(--vp-c-bg-soft);
}

.filename-input.invalid {
    background-color: var(--vp-c-danger-soft);
}

.change-diagram-button {
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
    flex-direction: column;
    align-items: center;
    background: var(--vp-backdrop-bg-color);
    transition: opacity 0.5s;
}

.modal-container {
    display: flex;
    flex-direction: column;
    width: min(calc(100% - 40px), 400px);
    min-height: 0;
    flex: 0 1 auto;
    margin-top: calc(var(--vp-nav-height) + 20px);
    margin-bottom: 20px;
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

.content {
  display: flex;
}
</style>
