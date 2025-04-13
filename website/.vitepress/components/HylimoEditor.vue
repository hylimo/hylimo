<template>
    <div class="editor" :class="{ hidden: hideMainContent }">
        <Splitpanes :horizontal="horizontal">
            <Pane>
                <div ref="editorElement" class="editor-element"></div>
            </Pane>
            <Pane>
                <div ref="sprottyWrapper" class="sprotty-wrapper">
                    <div :id="`sprotty-container-${id}`"></div>
                </div>
            </Pane>
        </Splitpanes>
    </div>
</template>
<script setup lang="ts">
import "reflect-metadata";
// @ts-ignore
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { ref, onBeforeUnmount, computed, watch } from "vue";
import type { ActionHandlerRegistry, IActionDispatcher } from "sprotty";
import { RequestModelAction, type ActionMessage } from "sprotty-protocol";
import {
    DiagramActionNotification,
    DiagramOpenNotification,
    PublishDocumentRevealNotification
} from "@hylimo/diagram-protocol";
import { createContainer, DiagramServerProxy, ResetCanvasBoundsAction, TYPES } from "@hylimo/diagram-ui";
import { Root } from "@hylimo/diagram-common";
import { onMounted } from "vue";
import { type EditorAppConfig, MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import { shallowRef } from "vue";
import { inject } from "vue";
import { language } from "../theme/lspPlugin";
import { diagramIdProviderKey, languageClientKey, languageServerConfigKey } from "../theme/injectionKeys";
import type { Disposable } from "vscode-languageserver-protocol";
import { onKeyDown, useResizeObserver } from "@vueuse/core";
import { useData } from "vitepress";
import * as monaco from "@codingame/monaco-vscode-editor-api";

defineProps({
    horizontal: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits<{
    "update:diagram": [diagram: Root];
    save: [];
}>();

const model = defineModel({
    type: String,
    required: true
});

/**
 * Enum which controls the current transaction state
 * Used for handling undo stops, which should be ignored during transactions
 */
enum TransactionState {
    /**
     * No transaction is in progress
     */
    None,
    /**
     * Transaction is in progress, ignore undo stops
     */
    InProgress,
    /**
     * Transaction is committed, go to normal mode after next final edit
     */
    Committed
}

const editorElement = ref<HTMLElement | null>(null);
const sprottyWrapper = ref<HTMLElement | null>(null);
const disposables = shallowRef<Disposable[]>([]);
const languageClient = inject(languageClientKey)!;
const languageServerConfig = inject(languageServerConfigKey)!;
const diagramIdProvider = inject(diagramIdProviderKey)!;
const id = ref(diagramIdProvider());
const { isDark } = useData();
const diagramBackground = computed(() => {
    const config = languageServerConfig.diagramConfig.value;
    return isDark.value ? config.darkBackgroundColor : config.lightBackgroundColor;
});
const actionDispatcher = shallowRef<IActionDispatcher>();
const editorModel = shallowRef<monaco.editor.ITextModel>();
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
const transactionState = ref(TransactionState.None);
const hideMainContent = ref(true);

watch(model, (newValue) => {
    if (editorModel.value != undefined && newValue != editorModel.value.getValue()) {
        editorModel.value.setValue(newValue);
    }
});

useResizeObserver(sprottyWrapper, () => {
    actionDispatcher.value?.dispatch({ kind: ResetCanvasBoundsAction.KIND } satisfies ResetCanvasBoundsAction);
});
useResizeObserver(editorElement, () => {
    editor.value?.layout();
});

onKeyDown(
    "s",
    (event) => {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }
        emit("save");
    },
    {
        target: editorElement
    }
);

onMounted(async () => {
    const currentLanguageClient = await languageClient.value;
    const wrapper = new MonacoEditorLanguageClientWrapper();
    disposables.value.push(wrapper);
    const editorAppConfig: EditorAppConfig = {
        editorOptions: {
            language,
            fixedOverflowWidgets: true,
            hover: {
                above: false
            },
            suggest: {
                snippetsPreventQuickSuggestions: false
            },
            scrollbar: {
                alwaysConsumeMouseWheel: false
            },
            glyphMargin: false,
            // @ts-expect-error (outdated types due to @codingame/monaco-vscode-api) disable to prevent / to open the search bar
            experimentalEditContextEnabled: false
        },
        codeResources: {
            modified: {
                text: model.value,
                uri: `diagram-${id.value}.hyl`,
                enforceLanguageId: language
            }
        },
        overrideAutomaticLayout: false
    };
    await wrapper.initAndStart({
        $type: "classic",
        htmlContainer: editorElement.value!,
        editorAppConfig,
        vscodeApiConfig: {
            vscodeApiInitPerformExternally: true
        }
    });

    const monacoEditor = wrapper.getEditor()!;
    monacoEditor.layout();
    editor.value = monacoEditor;
    hideMainContent.value = false;

    wrapper.updateCodeResources;
    editorModel.value = monacoEditor.getModel()!;
    const pushStackElement = editorModel.value.pushStackElement.bind(editorModel.value);

    // override pushStackElement to ignore undo stops during transactions
    editorModel.value.pushStackElement = () => {
        if (transactionState.value == TransactionState.None) {
            pushStackElement();
        }
    };

    editorModel.value.onDidChangeContent(() => {
        model.value = monacoEditor.getValue();
        if (transactionState.value == TransactionState.Committed) {
            // it's important to do this here, as by this, the undo stop before applying the last update is still ignored,
            // while the undo stop after applying counts as a normal undo stop
            transactionState.value = TransactionState.None;
        }
    });

    const uri = monacoEditor.getModel()?.uri?.toString();

    const revealHandler = currentLanguageClient.onNotification(PublishDocumentRevealNotification.type, (message) => {
        if (monacoEditor && message.uri == uri) {
            const range = message.range;
            const editorRange = {
                startLineNumber: range.start.line + 1,
                startColumn: range.start.character + 1,
                endLineNumber: range.end.line + 1,
                endColumn: range.end.character + 1
            };
            monacoEditor.setSelection(editorRange);
            monacoEditor.revealRange(editorRange);
        }
    });
    disposables.value.push(revealHandler);

    if (uri == undefined) {
        throw new Error("Missing editor or model");
    }
    currentLanguageClient.sendNotification(DiagramOpenNotification.type, {
        clientId: uri,
        diagramUri: uri
    });

    class LspDiagramServerProxy extends DiagramServerProxy {
        override clientId = uri!;

        override initialize(registry: ActionHandlerRegistry): void {
            super.initialize(registry);
            const handler = currentLanguageClient.onNotification(DiagramActionNotification.type, (message) => {
                if (
                    "newRoot" in message.action &&
                    message.action.newRoot != undefined &&
                    message.clientId == this.clientId
                ) {
                    emit("update:diagram", message.action.newRoot as Root);
                }
                this.messageReceived(message);
            });
            disposables.value.push(handler);
        }

        protected override sendMessage(message: ActionMessage): void {
            currentLanguageClient.sendNotification(DiagramActionNotification.type, message);
        }

        protected override handleUndo(): void {
            monacoEditor.focus();
            monacoEditor.trigger("diagram", "undo", {});
        }

        protected override handleRedo(): void {
            monacoEditor.focus();
            monacoEditor.trigger("diagram", "redo", {});
        }

        protected override handleTransactionStart(): void {
            editorModel.value?.pushStackElement();
            transactionState.value = TransactionState.InProgress;
        }

        protected override handleTransactionCommit(): void {
            transactionState.value = TransactionState.Committed;
        }
    }

    const container = createContainer(`sprotty-container-${id.value}`);
    container.bind(LspDiagramServerProxy).toSelf().inSingletonScope();
    container.bind(TYPES.ModelSource).toService(LspDiagramServerProxy);
    const currentActionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);
    actionDispatcher.value = currentActionDispatcher;
    currentActionDispatcher.request(RequestModelAction.create()).then((response) => {
        currentActionDispatcher.dispatch(response);
    });
});

onBeforeUnmount(() => {
    disposables.value.forEach((disposable) => {
        try {
            disposable.dispose();
        } catch (e) {}
    });
});
</script>
<style scoped>
.hidden {
    display: none;
}
.editor-element {
    width: 100%;
    height: 100%;
}

.sprotty-wrapper {
    --diagram-background: v-bind(diagramBackground);
}
</style>
<style>
.splitpanes {
    height: 100%;
}

.splitpanes__splitter {
    z-index: 5;
    background: transparent;
    transition: background-color 0s 0s;
    position: relative;
}

.splitpanes--vertical .splitpanes__splitter {
    margin-left: -2px;
    margin-right: -2px;
    width: 4px;
}

.splitpanes--horizontal .splitpanes__splitter {
    margin-top: -2px;
    margin-bottom: -2px;
    height: 4px;
}

@media (pointer: coarse) {
    .splitpanes__splitter:before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        opacity: 0;
        z-index: 1;
    }
    .splitpanes__splitter:hover:before {
        opacity: 1;
    }
    .splitpanes--vertical > .splitpanes__splitter:before {
        left: -20px;
        right: -20px;
        height: 100%;
    }
    .splitpanes--horizontal > .splitpanes__splitter:before {
        top: -20px;
        bottom: -20px;
        width: 100%;
    }
}

.splitpanes.splitpanes--dragging .splitpanes__splitter,
.splitpanes__splitter:hover {
    background: #007fd4;
}

.splitpanes__splitter:hover:not(.splitpanes--dragging) {
    transition: background-color 0s 0.25s;
}

.splitpanes__pane {
    position: relative;
}

.splitpanes__pane:not(:first-of-type)::before {
    content: "";
    display: block;
    background-color: var(--vp-c-gutter);
    position: absolute;
}

.splitpanes--vertical .splitpanes__pane:not(:first-of-type)::before {
    height: 100%;
    width: 1px;
}

.splitpanes--horizontal .splitpanes__pane:not(:first-of-type)::before {
    height: 1px;
    width: 100%;
}

.splitpanes.splitpanes--vertical.splitpanes--dragging {
    cursor: col-resize !important;
}

.splitpanes.splitpanes--horizontal.splitpanes--dragging {
    cursor: row-resize !important;
}
</style>
