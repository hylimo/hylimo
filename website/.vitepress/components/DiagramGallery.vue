<template>
    <div class="gallery">
        <div v-for="group in groups" :key="group.name" class="group">
            <p class="group-title">{{ group.name }}</p>
            <div class="entries">
                <button
                    v-for="example in group.examples"
                    :key="example.id"
                    class="entry"
                    :class="{ active: example.id === selectedId }"
                    :aria-pressed="example.id === selectedId"
                    @click="selectedId = example.id"
                >
                    <span class="entry-title">{{ example.title }}</span>
                    <span class="entry-description">{{ example.description }}</span>
                </button>
            </div>
        </div>
        <EmbeddedHylimoEditor :code="code" />
        <p class="caption">
            <span>{{ selected.title }} - {{ selected.description }}</span>
            <a v-if="selected.docs" :href="withBase(selected.docs.link)">{{ selected.docs.text }}</a>
        </p>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import EmbeddedHylimoEditor from "./EmbeddedHylimoEditor.vue";
import { diagramExamples } from "../examples";

const selectedId = ref(diagramExamples[0].id);

const selected = computed(() => diagramExamples.find((example) => example.id === selectedId.value)!);
const code = computed(() => encodeURIComponent(selected.value.source));

const groups = computed(() => {
    const names = [...new Set(diagramExamples.map((example) => example.group))];
    return names.map((name) => ({
        name,
        examples: diagramExamples.filter((example) => example.group === name)
    }));
});
</script>
<style scoped>
.group-title {
    margin: 20px 0 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
}

.group:first-child .group-title {
    margin-top: 0;
}

.entries {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
}

.entry {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    text-align: left;
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    background-color: var(--vp-c-bg-soft);
    transition:
        border-color 0.2s,
        background-color 0.2s;
}

.entry:hover {
    border-color: var(--vp-c-brand-1);
}

.entry.active {
    border-color: var(--vp-c-brand-1);
    background-color: var(--vp-c-brand-soft);
}

.entry-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--vp-c-text-1);
}

.entry.active .entry-title {
    color: var(--vp-c-brand-1);
}

.entry-description {
    font-size: 13px;
    line-height: 1.4;
    color: var(--vp-c-text-2);
}

.gallery :deep(.wrapper) {
    margin-top: 20px;
}

.caption {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin-top: 10px !important;
    font-size: 13px;
    color: var(--vp-c-text-2);
}
</style>
