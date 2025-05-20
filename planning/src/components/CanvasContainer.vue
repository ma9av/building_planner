<template>
  <div style="height: 100vh; display: flex;">
    <div
      style="
        position: fixed;
        top: 50%;
        left: 20px; /* Adjust for floating distance */
        transform: translateY(-50%);
        background-color: #f0f0f0;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
      "
    >
      <button @click="setTool('line')">Line</button><br>
      <button @click="setTool('freeDraw')">Free Draw</button><br>
      <button @click="setTool('rectangle')">Rectangle</button><br>
      <button @click="setTool('circle')">Circle</button><br>
      <button @click="deleteSelected">Delete</button>
      <hr>
      <div>
        <label for="strokeColor">Stroke Color:</label>
        <input type="color" id="strokeColor" v-model="strokeColor">
      </div>
      <div>
        <label for="fillColor">Fill Color:</label>
        <input type="color" id="fillColor" v-model="fillColor">
      </div>
    </div>
    <v-stage
      :config="{
        width: stageWidth,
        height: stageHeight,
        background: 'white',
      }"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @click="handleCanvasClick"
      @touchstart="handleMouseDown"
      @touchmove="handleMouseMove"
      @touchend="handleMouseUp"
      @tap="handleCanvasClick"
    >
      <v-layer ref="layer">
        <template v-for="shape in shapes" :key="shape.id">
          <v-line
            v-if="shape.type === 'line'"
            :config="shape.config"
          ></v-line>
          <v-line
            v-if="shape.type === 'freeDraw'"
            :config="shape.config"
          ></v-line>
          <v-rect
            v-if="shape.type === 'rectangle'"
            :config="shape.config"
          ></v-rect>
          <v-circle
            v-if="shape.type === 'circle'"
            :config="shape.config"
          ></v-circle>
        </template>
      </v-layer>
    </v-stage>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, watch } from 'vue';
import Rect from 'vue-konva';
import Circle from 'vue-konva';
import Line from 'vue-konva';
import Stage from 'vue-konva';
import Layer from 'vue-konva';

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';

interface DrawingState {
  tool: 'line' | 'freeDraw' | 'rectangle' | 'circle' | null;
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  currentShapeId: string | null;
  selectedShapeId: string | null;
}

interface BaseShape {
  id: string;
  type: string;
  config: any;
}

interface LineShape extends BaseShape {
  type: 'line' | 'freeDraw';
  config: Konva.LineConfig;
}

interface RectShape extends BaseShape {
  type: 'rectangle';
  config: Konva.RectConfig;
}

interface CircleShape extends BaseShape {
  type: 'circle';
  config: Konva.CircleConfig;
}

type Shape = LineShape | RectShape | CircleShape;

export default defineComponent({
  name: 'BuildingPlanner',
  components: {
    Stage,
    Layer,
    Line,
    Rect,
    Circle,
  },
  setup() {
    const layer = ref<InstanceType<typeof Layer> | null>(null);
    const stageWidth = ref(window.innerWidth);
    const stageHeight = ref(window.innerHeight);
    const drawingState = reactive<DrawingState>({
      tool: null,
      isDrawing: false,
      startPoint: null,
      currentShapeId: null,
      selectedShapeId: null,
    });
    const shapes = ref<Shape[]>([]);
    const strokeColor = ref('#000000');
    const fillColor = ref('transparent');

    onMounted(() => {
      window.addEventListener('resize', handleResize);
    });

    const handleResize = () => {
      stageWidth.value = window.innerWidth;
      stageHeight.value = window.innerHeight;
    };

    const setTool = (tool: DrawingState['tool']) => {
      drawingState.tool = tool;
      drawingState.selectedShapeId = null;
      // Reset stroke width for all shapes (using direct Konva methods for simplicity)
      if (layer.value && layer.value.getStage()) {
        layer.value.getStage().find('.draggable').forEach((node: Konva.Shape) => {
          node.strokeWidth(2);
        });
        layer.value.draw();
      }
    };

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingState.tool) return;
      drawingState.isDrawing = true;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      drawingState.startPoint = pos;
      const id = uuidv4();

      switch (drawingState.tool) {
        case 'line':
          shapes.value.push({
            id,
            type: 'line',
            config: {
              points: [pos.x, pos.y, pos.x, pos.y],
              stroke: strokeColor.value,
              strokeWidth: 2,
              draggable: true,
              id,
            },
          });
          drawingState.currentShapeId = id;
          break;
        case 'freeDraw':
          shapes.value.push({
            id,
            type: 'freeDraw',
            config: {
              points: [pos.x, pos.y],
              stroke: strokeColor.value,
              strokeWidth: 2,
              draggable: true,
              lineCap: 'round',
              lineJoin: 'round',
              id,
            },
          });
          drawingState.currentShapeId = id;
          break;
        case 'rectangle':
          shapes.value.push({
            id,
            type: 'rectangle',
            config: {
              x: pos.x,
              y: pos.y,
              width: 0,
              height: 0,
              stroke: strokeColor.value,
              fill: fillColor.value,
              strokeWidth: 2,
              draggable: true,
              id,
            },
          });
          drawingState.currentShapeId = id;
          break;
        case 'circle':
          shapes.value.push({
            id,
            type: 'circle',
            config: {
              x: pos.x,
              y: pos.y,
              radius: 0,
              stroke: strokeColor.value,
              fill: fillColor.value,
              strokeWidth: 2,
              draggable: true,
              id,
            },
          });
          drawingState.currentShapeId = id;
          break;
      }
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingState.isDrawing || !drawingState.currentShapeId || !drawingState.startPoint) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      const currentShape = shapes.value.find(shape => shape.id === drawingState.currentShapeId);
      if (currentShape) {
        switch (currentShape.type) {
          case 'line':
            (currentShape as LineShape).config.points = [
              drawingState.startPoint.x,
              drawingState.startPoint.y,
              pos.x,
              pos.y,
            ];
            break;
          case 'freeDraw':
            (currentShape as LineShape).config.points = (currentShape as LineShape).config.points.concat([pos.x, pos.y]);
            break;
          case 'rectangle':
            (currentShape as RectShape).config.width = Math.abs(pos.x - drawingState.startPoint.x);
            (currentShape as RectShape).config.height = Math.abs(pos.y - drawingState.startPoint.y);
            (currentShape as RectShape).config.x = Math.min(pos.x, drawingState.startPoint.x);
            (currentShape as RectShape).config.y = Math.min(pos.y, drawingState.startPoint.y);
            break;
          case 'circle':
            const radius = Math.sqrt(
              Math.pow(pos.x - drawingState.startPoint.x, 2) +
              Math.pow(pos.y - drawingState.startPoint.y, 2)
            ) / 2;
            (currentShape as CircleShape).config.radius = radius;
            (currentShape as CircleShape).config.x = (pos.x + drawingState.startPoint.x) / 2;
            (currentShape as CircleShape).config.y = (pos.y + drawingState.startPoint.y) / 2;
            break;
        }
      }
    };

    const handleMouseUp = () => {
      drawingState.isDrawing = false;
      drawingState.currentShapeId = null;
      drawingState.startPoint = null;
    };

    const handleCanvasClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (drawingState.tool === null) {
        const clickedShape = e.target;
        if (clickedShape.className !== 'Stage') {
          // Deselect previous shape
          if (drawingState.selectedShapeId) {
            const previousSelected = shapes.value.find(s => s.id === drawingState.selectedShapeId);
            if (previousSelected) {
              previousSelected.config.strokeWidth = 2;
            }
          }
          drawingState.selectedShapeId = clickedShape.id();
          const currentSelected = shapes.value.find(s => s.id === drawingState.selectedShapeId);
          if (currentSelected) {
            currentSelected.config.strokeWidth = 5;
          }
        } else {
          // Clicked on the background, deselect
          if (drawingState.selectedShapeId) {
            const previousSelected = shapes.value.find(s => s.id === drawingState.selectedShapeId);
            if (previousSelected) {
              previousSelected.config.strokeWidth = 2;
            }
            drawingState.selectedShapeId = null;
          }
        }
      }
    };

    const deleteSelected = () => {
      if (drawingState.selectedShapeId) {
        shapes.value = shapes.value.filter(shape => shape.id !== drawingState.selectedShapeId);
        drawingState.selectedShapeId = null;
      }
    };

    watch(strokeColor, (newColor) => {
      if (drawingState.selectedShapeId) {
        const selectedShape = shapes.value.find(s => s.id === drawingState.selectedShapeId);
        if (selectedShape) {
          selectedShape.config.stroke = newColor;
        }
      }
    });

    watch(fillColor, (newColor) => {
      if (drawingState.selectedShapeId) {
        const selectedShape = shapes.value.find(s => s.id === drawingState.selectedShapeId);
        if (selectedShape && (selectedShape.type === 'rectangle' || selectedShape.type === 'circle')) {
          selectedShape.config.fill = newColor;
        }
      }
    });

    return {
      layer,
      stageWidth,
      stageHeight,
      setTool,
      drawingState,
      shapes,
      deleteSelected,
      strokeColor,
      fillColor,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleCanvasClick,
    };
  },
});
</script>

<style scoped>
/* You can add more styles here if needed */
</style>