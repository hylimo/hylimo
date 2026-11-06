<template>
    <VPNavMenuLink :item="transformedItem" :screen="screenMenu" />
</template>
<script setup lang="ts">
import { useUrlSearchParams } from "@vueuse/core";
import type { DefaultTheme } from "vitepress";
import VPNavMenuLink from "vitepress/dist/client/theme-default/components/VPNavMenuLink.vue";
import { computed, type PropType } from "vue";

const props = defineProps({
    item: {
        type: Object as PropType<DefaultTheme.NavItemWithLink>,
        required: true
    },
    screenMenu: {
        type: Boolean,
        default: false
    }
});

const transformedItem = computed(() => ({
    ...props.item,
    target: props.item.target ?? (isEmbedded.value ? "_blank" : undefined)
}));

const urlParams = useUrlSearchParams();
const isEmbedded = computed(() => urlParams.embedded != undefined);
</script>
