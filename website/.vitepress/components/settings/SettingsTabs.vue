<template>
    <div class="vp-code-group settings-tabs">
        <div class="tabs">
            <template v-for="tab in tabs">
                <input type="radio" :id="`tab-${tab.id}`" :checked="tab.id == model" @change="model = tab.id" />
                <label :for="`tab-${tab.id}`" @click="model = tab.id">{{ tab.name }}</label>
            </template>
        </div>
        <slot />
    </div>
</template>
<script setup lang="ts">
import { PropType } from "vue";

defineProps({
    tabs: {
        type: Array as PropType<
            {
                name: string;
                id: string;
            }[]
        >,
        required: true
    }
});

const model = defineModel({
    type: String,
    required: true
});
</script>
<style scoped>
.vp-code-group.settings-tabs > .tabs {
    background-color: unset;
    padding: 0 22px;
}
</style>
