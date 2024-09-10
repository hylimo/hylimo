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
import { ref, onBeforeUnmount } from "vue";
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
import { MonacoEditorLanguageClientWrapper, UserConfig } from "monaco-editor-wrapper";
import { shallowRef } from "vue";
import { inject } from "vue";
import { language, languageClientKey } from "../theme/lspPlugin";
import { Disposable } from "vscode-languageserver-protocol";
import { useResizeObserver } from "@vueuse/core";
import { v4 as uuid } from "uuid"

const id = uuid()

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

const editorElement = ref<HTMLElement | null>(null);
const sprottyWrapper = ref<HTMLElement | null>(null);
const disposables = shallowRef<Disposable[]>([]);
const languageClient = inject(languageClientKey)!;
const actionDispatcher = shallowRef<IActionDispatcher>();
const hideMainContent = ref(true);

useResizeObserver(sprottyWrapper, () => {
    actionDispatcher.value?.dispatch({ kind: ResetCanvasBoundsAction.KIND } satisfies ResetCanvasBoundsAction);
});

onMounted(async () => {
    const currentLanguageClient = await languageClient.value;
    const wrapper = new MonacoEditorLanguageClientWrapper();
    disposables.value.push(wrapper);
    const userConfig: UserConfig = {
        wrapperConfig: {
            editorAppConfig: {
                $type: "classic",
                editorOptions: {
                    language,
                    value: model.value,
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
                    }
                }
            }
        }
    };

    await wrapper.initAndStart(userConfig, editorElement.value!);

    const editor = wrapper.getEditor()!;
    hideMainContent.value = false;

    editor.getModel()?.onDidChangeContent(() => {
        model.value = editor.getValue();
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
