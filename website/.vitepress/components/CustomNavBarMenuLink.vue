<template>
    <VPNavBarMenuLink :item="transformedItem" />
</template>
<script setup lang="ts">
import { useUrlSearchParams } from "@vueuse/core";
import type { DefaultTheme } from "vitepress";
import VPNavBarMenuLink from "vitepress/dist/client/theme-default/components/VPNavBarMenuLink.vue";
import { computed, type PropType } from "vue";

const props = defineProps({
    item: {
        type: Object as PropType<DefaultTheme.NavItemWithLink>,
        required: true
    }
});

const transformedItem = computed(() => ({
    ...props.item,
    target: props.item.target ?? (isEmbedded.value ? "_blank" : undefined)
}));

const urlParams = useUrlSearchParams();
const isEmbedded = computed(() => urlParams.embedded != undefined);
</script>
