<template>
    <ScrollAreaRoot ref="root" class="scroll-area" type="hover" :scroll-hide-delay="scrollHideDelay">
        <ScrollAreaViewport class="scroll-area-viewport">
            <slot />
        </ScrollAreaViewport>
        <ScrollAreaScrollbar class="scroll-area-scrollbar" orientation="vertical">
            <ScrollAreaThumb class="scroll-area-thumb" />
        </ScrollAreaScrollbar>
    </ScrollAreaRoot>
</template>
<!--
    A scroll area with a custom, overlaying scrollbar which is only shown while it is hovered or scrolled.
    The toolbox provides the same behaviour based on its own implementation, as it does not use Vue.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "reka-ui";

/**
 * Time in ms the scrollbar stays visible after the pointer left the scroll area.
 */
const scrollHideDelay = 600;

const root = ref<InstanceType<typeof ScrollAreaRoot> | null>(null);

defineExpose({
    /**
     * The scrolling element, e.g. to listen for scroll events.
     */
    viewport: computed(() => root.value?.viewport)
});
</script>
<!-- not scoped, as the classes are applied to elements rendered by the reka-ui components -->
<style>
.scroll-area {
    --scroll-area-scrollbar-size: 10px;
    --scroll-area-scrollbar-padding: 2px;
    --scroll-area-thumb-background: color-mix(in srgb, currentColor 25%, transparent);
    --scroll-area-thumb-background-hover: color-mix(in srgb, currentColor 45%, transparent);

    position: relative;
    display: flex;
    min-height: 0;
}

.scroll-area-viewport {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overscroll-behavior: contain;
}

.scroll-area-scrollbar {
    display: flex;
    box-sizing: border-box;
    padding: var(--scroll-area-scrollbar-padding);
    touch-action: none;
    user-select: none;
}

.scroll-area-scrollbar[data-orientation="vertical"] {
    width: var(--scroll-area-scrollbar-size);
}

/* the scrollbar is unmounted once hidden, so it is faded using animations instead of transitions */
.scroll-area-scrollbar[data-state="visible"] {
    animation: scroll-area-scrollbar-in 0.2s ease;
}

.scroll-area-scrollbar[data-state="hidden"] {
    animation: scroll-area-scrollbar-out 0.2s ease forwards;
}

@keyframes scroll-area-scrollbar-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes scroll-area-scrollbar-out {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

.scroll-area-thumb {
    flex: 1;
    position: relative;
    border-radius: 9999px;
    background: var(--scroll-area-thumb-background);
    transition: background-color 0.2s ease;
}

.scroll-area-thumb:hover {
    background: var(--scroll-area-thumb-background-hover);
}

@media (prefers-reduced-motion: reduce) {
    .scroll-area-scrollbar,
    .scroll-area-thumb {
        animation: none;
        transition: none;
    }
}
</style>
