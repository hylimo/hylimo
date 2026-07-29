<template>
    <EmbeddedHylimoEditor :code="code" />
</template>
<script setup lang="ts">
import { computed } from "vue";
import EmbeddedHylimoEditor from "./EmbeddedHylimoEditor.vue";
import { getDiagramExample } from "../examples";

const props = defineProps({
    id: {
        type: String,
        required: true
    }
});

const code = computed(() => encodeURIComponent(getDiagramExample(props.id).source));
</script>
