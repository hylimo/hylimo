<template>
    <div :class="{ hidden: hideMainContent }">
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
import { ref, onBeforeUnmount, computed } from "vue";
import { ActionHandlerRegistry, IActionDispatcher, TYPES } from "sprotty";
import { RequestModelAction, ActionMessage } from "sprotty-protocol";
import {
    DiagramActionNotification,
    DiagramOpenNotification,
    PublishDocumentRevealNotification
} from "@hylimo/diagram-protocol";
import { createContainer, DiagramServerProxy, ResetCanvasBoundsAction } from "@hylimo/diagram-ui";
import { Root } from "@hylimo/diagram-common";
import { onMounted } from "vue";
import { EditorAppConfig, MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import { shallowRef } from "vue";
import { inject } from "vue";
import { language } from "../theme/lspPlugin";
import { languageClientKey, languageServerConfigKey } from "../theme/injectionKeys";
import { Disposable } from "vscode-languageserver-protocol";
import { useResizeObserver } from "@vueuse/core";
import { v4 as uuid } from "uuid";
import * as monaco from "monaco-editor";
import { useData } from "vitepress";

const id = uuid();

defineProps({
    horizontal: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits<{
    "update:diagram": [diagram: Root];
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
const { isDark } = useData();
const diagramBackground = computed(() => {
    const config = languageServerConfig.diagramConfig.value;
    return isDark.value ? config.darkBackgroundColor : config.lightBackgroundColor;
});
const actionDispatcher = shallowRef<IActionDispatcher>();
const transactionState = ref(TransactionState.None);
const hideMainContent = ref(true);

useResizeObserver(sprottyWrapper, () => {
    actionDispatcher.value?.dispatch({ kind: ResetCanvasBoundsAction.KIND } satisfies ResetCanvasBoundsAction);
});

onMounted(async () => {
    const currentLanguageClient = await languageClient.value;
    const wrapper = new MonacoEditorLanguageClientWrapper();
    disposables.value.push(wrapper);
    const editorAppConfig: EditorAppConfig = {
        editorOptions: {
            language,
            model: null,
            automaticLayout: true,
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
            glyphMargin: false
        }
    };
    await wrapper.initAndStart({
        $type: "classic",
        htmlContainer: editorElement.value!,
        editorAppConfig,
        vscodeApiConfig: {
            vscodeApiInitPerformExternally: true
        }
    });

    const editor = wrapper.getEditor()!;
    hideMainContent.value = false;

    const editorModel = monaco.editor.createModel(model.value, language);
    editor.setModel(editorModel);
    const pushStackElement = editorModel.pushStackElement.bind(editorModel);

    // override pushStackElement to ignore undo stops during transactions
    editorModel.pushStackElement = () => {
        if (transactionState.value == TransactionState.None) {
            pushStackElement();
        }
    };

    editorModel.onDidChangeContent(() => {
        model.value = editor.getValue();
        if (transactionState.value == TransactionState.Committed) {
            // it's important to do this here, as by this, the undo stop before applying the last update is still ignored,
            // while the undo stop after applying counts as a normal undo stop
            transactionState.value = TransactionState.None;
        }
    });

    const uri = editor.getModel()?.uri?.toString();

    const revealHandler = currentLanguageClient.onNotification(PublishDocumentRevealNotification.type, (message) => {
        if (editor && message.uri == uri) {
            const range = message.range;
            const editorRange = {
                startLineNumber: range.start.line + 1,
                startColumn: range.start.character + 1,
                endLineNumber: range.end.line + 1,
                endColumn: range.end.character + 1
            };
            editor.setSelection(editorRange);
            editor.revealRange(editorRange);
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
            editor.trigger("diagram", "undo", {});
        }

        protected override handleRedo(): void {
            editor.trigger("diagram", "redo", {});
        }

        protected override handleTransactionStart(): void {
            editorModel.pushStackElement();
            transactionState.value = TransactionState.InProgress;
        }

        protected override handleTransactionCommit(): void {
            transactionState.value = TransactionState.Committed;
        }
    }

    const container = createContainer(`sprotty-container-${id}`);
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

.splitpanes.splitpanes--dragging .splitpanes__splitter,
.splitpanes__splitter:hover {
    transition: background-color 0s 0.25s;
    background: #007fd4;
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
</style>
