<template>
    <div style="position: fixed; left: 20px; top: 20px; background-color: #f0f0f0; padding: 10px; border-radius: 5px; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);">
      <button @click="selectTool('line')" :class="{ active: selectedTool === 'line' }">Line</button>
      <button @click="selectTool('free')" :class="{ active: selectedTool === 'free' }">Free Draw</button>
      <button @click="selectTool('circle')" :class="{ active: selectedTool === 'circle' }">Circle</button>
      <button @click="selectTool('rect')" :class="{ active: selectedTool === 'rect' }">Rectangle</button>
      <button @click="selectTool('drag')" :class="{ active: selectedTool === 'drag' }">Drag</button>
      <button @click="deleteSelected">Delete</button>
      <button @click="selectTool('annotate')" :class="{ active: selectedTool === 'annotate' }">Annotate</button>
      </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, inject } from 'vue';
  
  export default defineComponent({
    name: 'Toolbar',
    props: {
      selectedTool: String,
      selectTool: Function,
      deleteSelected: Function,
    },
    setup(props) {
      return {};
    },
  });
  </script>
  
  <style scoped>
  button {
    margin-right: 5px;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
  }
  
  button.active {
    background-color: #ddd;
  }
  </style>