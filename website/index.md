---
layout: false
---

<Home />

<script setup>
import { defineClientComponent } from "vitepress"

const Home = defineClientComponent(() => import("./.vitepress/components/Home.vue"))
</script>
