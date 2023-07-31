<script setup>
</script>
<template>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
    <button @click="$i18n.locale = 'en'">English</button>
    <button @click="$i18n.locale = 'zh_CN'">中文</button>
</template>
<style scoped>
button {
    width: 7em;
    min-height: 2em;
    margin-left: 0.5em;
}

a {
    margin-left: 0.5em;
}

a:first-child {
    margin-left: 0;
}
</style>