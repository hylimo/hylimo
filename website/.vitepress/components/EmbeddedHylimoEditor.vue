<template>
    <div ref="wrapper" class="wrapper">
        <HylimoEditor class="editor" :model-value="decodeURIComponent(code)" horizontal />
        <div class="hint" :class="{ visible: hintVisible }" aria-hidden="true">
            <span class="hint-text">{{ hintText }}</span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { defineClientComponent } from "vitepress";
import { defaultDocument, useEventListener } from "@vueuse/core";
import { onBeforeUnmount, ref, useTemplateRef } from "vue";

const HylimoEditor = defineClientComponent(() => import("./HylimoEditor.vue"));

defineProps({
    code: {
        type: String,
        required: true
    }
});

/**
 * How long the hint is shown after a scroll event was ignored
 */
const HINT_DURATION = 1500;

const wrapper = useTemplateRef("wrapper");

/**
 * Whether this editor was clicked and not left again since.
 * Together with the focus, this decides whether the editor handles scroll events itself, see {@link isInteractive}.
 */
const clicked = ref(false);
const hintVisible = ref(false);
const hintText = ref("Click to interact");
let hintTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

/**
 * Whether this editor currently handles scroll events itself, which is the case if it was clicked or tapped, or if
 * it contains the focus. As long as it does not, scrolling over it scrolls the page instead of scrolling the code
 * editor / zooming the diagram.
 *
 * @returns true if scroll events should be handled by this editor
 */
function isInteractive(): boolean {
    return clicked.value || (wrapper.value?.contains(defaultDocument?.activeElement ?? null) ?? false);
}

/**
 * Stops scroll events from reaching the editor and the diagram while this editor is not interactive.
 * The default action is not prevented, therefore the page scrolls as if the editor was not there.
 *
 * @param event the scroll event to ignore
 */
function ignoreScrollIfNotInteractive(event: Event): void {
    if (isInteractive()) {
        return;
    }
    event.stopPropagation();
    showHint();
}

/**
 * Shows the hint explaining how to make this editor interactive for {@link HINT_DURATION} milliseconds
 */
function showHint(): void {
    hintVisible.value = true;
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => {
        hintVisible.value = false;
    }, HINT_DURATION);
}

useEventListener(wrapper, "wheel", ignoreScrollIfNotInteractive, { capture: true });
useEventListener(wrapper, "touchmove", ignoreScrollIfNotInteractive, { capture: true });

useEventListener(
    defaultDocument,
    "pointerdown",
    (event: PointerEvent) => {
        if (!wrapper.value?.contains(event.target as Node)) {
            clicked.value = false;
        } else if (event.pointerType !== "touch") {
            clicked.value = true;
        } else {
            // a touch gesture may just as well be a scroll, therefore it only makes this editor interactive
            // if it turns out to be a tap, which is handled by the click listener below
            hintText.value = "Tap to interact";
        }
    },
    { capture: true }
);
useEventListener(wrapper, "click", () => {
    clicked.value = true;
});

onBeforeUnmount(() => {
    clearTimeout(hintTimeout);
});
</script>
<style scoped>
.wrapper {
    width: 100%;
    aspect-ratio: 1 / 1;
    position: relative;
}

.editor {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    border: 1px solid var(--vp-c-border);
    overflow: hidden;
    padding-top: 12px;
    background: var(--editor-background);
}

.hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease-out;
}

.hint::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    background: var(--vp-c-bg);
    opacity: 0.6;
}

.hint.visible {
    opacity: 1;
    transition: opacity 0.15s ease-in;
}

.hint-text {
    position: relative;
    padding: 8px 16px;
    border-radius: 8px;
    background: var(--vp-c-bg-elv);
    border: 1px solid var(--vp-c-border);
    color: var(--vp-c-text-1);
    font-size: 14px;
    font-weight: 500;
}
</style>
