<template>
  <div id="app">
    <div id="toolbar">
      <button @click="setTool('select')">Select</button>
      <button @click="setTool('line')">Draw Line</button>
      <button @click="setTool('rect')">Draw Rectangle</button>
      <button @click="setTool('circle')">Draw Circle</button>
      <button @click="setTool('freeDraw')">Free Draw</button>
      <button @click="deleteSelected">Delete Selected</button>
      <button @click="saveDrawing"> Save </button>
      <label>
        Snap to Grid:
        <input type="checkbox" v-model="snapToGrid" />
      </label>
      <label>
        Show Annotations:
        <input type="checkbox" v-model="showAnnotations" />
      </label>
    </div>
    <div id="container">
      <div id="konva-holder" ref="konvaContainer"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Konva from 'konva';

const konvaContainer = ref(null);
let stage = null;
let layer = null;
const currentTool = ref('select'); // Default to select tool
const isDrawing = ref(false);
let currentShape = null;
const shapes = ref([]);
const selectedShapes = ref([]); // Use selectedShapes for multi-selection
let freeDrawPoints = [];
const snapToGrid = ref(true);
const gridSize = 20;
const showAnnotations = ref(true);
const annotations = ref([]);
let transform = null; //for transform

const setupShapeEventHandlers = (shape) => {
  // Remove any existing event handlers
  shape.off('dragmove');
  shape.off('dragend');
  shape.off('transformend');
  
  // Listen for dragging - continuously update annotation position during drag
  shape.on('dragmove', () => {
    updateAnnotationPosition(shape);
    layer.draw();
  });
  
  // When drag ends, update annotation with proper calculations
  shape.on('dragend', () => {
    if (snapToGrid.value) {
      // Snap position to grid
      shape.x(Math.round(shape.x() / gridSize) * gridSize);
      shape.y(Math.round(shape.y() / gridSize) * gridSize);
      
      // For lines, also snap points
      if (shape instanceof Konva.Line) {
        // Only snap regular lines, not free drawing
        if (shape.points().length === 4) {
          const points = shape.points();
          const newPoints = points.map((p, index) => {
            return Math.round(p / gridSize) * gridSize;
          });
          shape.points(newPoints);
        }
      }
    }
    
    // Update annotation after snapping
    updateAnnotation(shape);
    layer.draw();
  });
  
  // When transform ends, update annotation with proper calculations
  shape.on('transformend', () => {
    updateAnnotation(shape);
    layer.draw();
  });
}


onMounted(() => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  stage = new Konva.Stage({
    container: konvaContainer.value,
    width: width,
    height: height,
    multiSelectEnabled: true, // Enable Konva's built-in multi-select
  });

  layer = new Konva.Layer();
  stage.add(layer);

  // Draw grid
  const gridLayer = new Konva.Layer();
  const numCols = Math.ceil(width / gridSize);
  const numRows = Math.ceil(height / gridSize);
  for (let i = 0; i < numCols; i++) {
    gridLayer.add(
      new Konva.Line({
        x: i * gridSize,
        y: 0,
        points: [0, 0, 0, height],
        stroke: 'lightgray',
        strokeWidth: 0.5,
      })
    );
  }
  for (let j = 0; j < numRows; j++) {
    gridLayer.add(
      new Konva.Line({
        x: 0,
        y: j * gridSize,
        points: [0, 0, width, 0],
        stroke: 'lightgray',
        strokeWidth: 0.5,
      })
    );
  }
  stage.add(gridLayer);
  gridLayer.moveToBottom();

  // Add a Konva Transformer
  transform = new Konva.Transformer({
    nodes: [],
    centeredScaling: true,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    resizeSnaps: [0, 0.1, 0.5, 1, 2, 5, 10, 20, 50, 100],
  });
  layer.add(transform);

  layer.draw();

  stage.on('mousedown touchstart', (e) => {
    if (!currentTool.value) return;
    isDrawing.value = true;
    let pos = stage.getPointerPosition();
    if (snapToGrid.value) {
      pos = {
        x: Math.round(pos.x / gridSize) * gridSize,
        y: Math.round(pos.y / gridSize) * gridSize,
      };
    }

    if (currentTool.value === 'select') {
      // Handle selection
      const shape = e.target;
      if (shape === stage) {
        // Clicked on stage, clear selection
        selectedShapes.value.forEach((selectedShape) => {
          selectedShape.stroke('black');
          selectedShape.strokeWidth(1);
        });
        selectedShapes.value = [];
        transform.nodes([]);
        layer.draw();
        return;
      }

      // Check if this shape is a selectable element (any Konva.Shape)
      const isSelectable = shape instanceof Konva.Shape;
      if (isSelectable) {
        // Mark the shape as selected
        if (selectedShapes.value.includes(shape)) {
          // Shape is already selected, remove it from selection
          selectedShapes.value = selectedShapes.value.filter((s) => s !== shape);
          shape.stroke('black');
          shape.strokeWidth(shape instanceof Konva.Line ? 2 : 1); // Preserve original strokeWidth
          transform.nodes(selectedShapes.value);
        } else {
          // Shape is not selected, add it to selection
          selectedShapes.value.push(shape);
          shape.stroke('blue');
          shape.strokeWidth(3);
          transform.nodes(selectedShapes.value);
        }
        layer.draw();
      }
      return; // Important: Return here to prevent drawing
    }

    if (currentTool.value === 'line') {
      currentShape = new Konva.Line({
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: 'black',
        strokeWidth: 2,
        draggable: true,
        hitStrokeWidth: 10, // Increase hit area for better selection
      });
    } else if (currentTool.value === 'rect') {
      currentShape = new Konva.Rect({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill: 'lightgray',
        stroke: 'black',
        strokeWidth: 1,
        draggable: true,
      });
    } else if (currentTool.value === 'circle') {
      currentShape = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        radius: 0,
        fill: 'lightblue',
        stroke: 'black',
        strokeWidth: 1,
        draggable: true,
      });
    } else if (currentTool.value === 'freeDraw') {
      freeDrawPoints = [pos.x, pos.y];
      currentShape = new Konva.Line({
        points: freeDrawPoints,
        stroke: 'black',
        strokeWidth: 3,
        lineCap: 'round',
        lineJoin: 'round',
        draggable: true,
      });
      layer.add(currentShape);
      shapes.value.push(currentShape);
    }

    if (currentShape) {
      if (currentTool.value !== 'freeDraw') {
        layer.add(currentShape);
        shapes.value.push(currentShape);
      }
      layer.draw();
    }
  });

  stage.on('mousemove touchmove', () => {
    if (!isDrawing.value || !currentShape) return;
    let pos = stage.getPointerPosition();
    if (snapToGrid.value) {
      pos = {
        x: Math.round(pos.x / gridSize) * gridSize,
        y: Math.round(pos.y / gridSize) * gridSize,
      };
    }
    if (currentTool.value === 'line') {
      const points = currentShape.points();
      currentShape.points([points[0], points[1], pos.x, pos.y]);
    } else if (currentTool.value === 'rect') {
      const startX = currentShape.x();
      const startY = currentShape.y();
      const width = pos.x - startX;
      const height = pos.y - startY;

      currentShape.width(width);
      currentShape.height(height);
    } else if (currentTool.value === 'circle') {
      const startX = currentShape.x();
      const startY = currentShape.y();
      const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
      currentShape.radius(radius);
    } else if (currentTool.value === 'freeDraw') {
      freeDrawPoints.push(pos.x, pos.y);
      currentShape.points(freeDrawPoints);
    }
    layer.draw();
  });

  stage.on('mouseup touchend', () => {
    isDrawing.value = false;
    if (currentShape) {
      // Check if it's a free draw with minimal points
      if (currentTool.value === 'freeDraw' && freeDrawPoints.length < 8) {
        currentShape.remove();
        shapes.value = shapes.value.filter(shape => shape !== currentShape);
        layer.draw();
        currentShape = null;
        freeDrawPoints = [];
        return;
      }
      
      // Add annotation
      createAnnotation(currentShape);
      
      // Setup event handlers for the shape to update annotations
      setupShapeEventHandlers(currentShape);
      
      selectedShapes.value = [currentShape];
      transform.nodes(selectedShapes.value);
      layer.draw();
    }
    currentShape = null;
    freeDrawPoints = [];
  });

  stage.on('click tap', (e) => {
    if (currentTool.value !== 'select')
      return;
    if (e.target === stage) {
      selectedShapes.value.forEach((s) => {
        s.stroke('black');
        s.strokeWidth(1);
      });
      selectedShapes.value = [];
      transform.nodes([]);
      layer.draw();
    }
  });

  // Add transformer change events
  transform.on('transformend', (e) => {
    const nodes = transform.nodes();
    nodes.forEach(node => {
      updateAnnotation(node);
    });
    layer.draw();
  });
  
  transform.on('transform', (e) => {
    const nodes = transform.nodes();
    nodes.forEach(node => {
      updateAnnotationPosition(node);
    });
    layer.draw();
  });
  
  // Set initial tool to allow drawing immediately
  setTool('line');
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (stage) {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
    }
  });
});



const setTool = (tool) => {
  currentTool.value = tool;
  if (tool === 'select') {
    transform.nodes(selectedShapes.value);
  } else {
    transform.nodes([]);
  }
  layer?.draw();
};

const deleteSelected = () => {
  if (selectedShapes.value.length > 0) {
    selectedShapes.value.forEach((shape) => {
      // Remove associated annotation
      const annotationToRemove = annotations.value.find(
        (anno) => anno.shapeId === shape.id()
      );
      if (annotationToRemove) {
        annotationToRemove.remove(); // Remove from layer properly
        annotations.value = annotations.value.filter(
          (anno) => anno !== annotationToRemove
        );
      }
      shape.remove();
      shapes.value = shapes.value.filter((s) => s !== shape);
    });
    selectedShapes.value = [];
    transform.nodes([]);
    layer.draw();
  }
};

// Calculate the text for an annotation based on the shape type
const getAnnotationText = (shape) => {
  let text = '';
  if (shape instanceof Konva.Line) {
    const points = shape.points();
    // Make sure we have enough points
    if (points.length >= 4) {
      // For regular lines (not free draw)
      if (points.length === 4) {
        const length = Math.sqrt(
          Math.pow(points[2] - points[0], 2) + Math.pow(points[3] - points[1], 2)
        );
        text = `Length: ${length.toFixed(2)} px`;
      } else {
        // Free draw - calculate total length
        let totalLength = 0;
        for (let i = 0; i < points.length - 2; i += 2) {
          totalLength += Math.sqrt(
            Math.pow(points[i + 2] - points[i], 2) + 
            Math.pow(points[i + 3] - points[i + 1], 2)
          );
        }
        text = `Length: ${totalLength.toFixed(2)} px`;
      }
    }
  } else if (shape instanceof Konva.Rect) {
    const width = Math.abs(shape.width());
    const height = Math.abs(shape.height());
    text = `Width: ${width.toFixed(2)} px, Height: ${height.toFixed(2)} px`;
  } else if (shape instanceof Konva.Circle) {
    const radius = shape.radius();
    text = `Radius: ${radius.toFixed(2)} px`;
  }
  return text;
};

// Create a new annotation for a shape
const createAnnotation = (shape) => {
  // Create a unique ID for the annotation
  const annotationId = 'annotation-' + shape.id();
  console.log('Creating annotation for shape:', shape);
  
  if(shape.height() < 10 || shape.width() < 10) {
    console.log('Shape too small for annotation:', shape);
    return;
  }
  
  // Create the text 
  const text = getAnnotationText(shape);
  if (!text) return;
  
  // Create a group to manage the annotation
  const annotationGroup = new Konva.Group({
    id: annotationId,
    shapeId: shape.id(),
    visible: showAnnotations.value,
  });
  
  const textNode = new Konva.Text({
    text,
    fontSize: 12,
    fill: 'black',
    align: 'center',
    padding: 2,
  });
  
  textNode.offsetX(textNode.width() / 2);
  annotationGroup.add(textNode);
  
  // Position the annotation
  const pos = getAnnotationPosition(shape);
  annotationGroup.position(pos);
  
  // Add to layer and store in our annotations array
  layer.add(annotationGroup);
  annotations.value.push(annotationGroup);
  
  // Make sure the annotation is behind the transformer
  annotationGroup.moveToTop();
  transform.moveToTop();
  
  layer.draw();
  
  return annotationGroup;
};

// Update an existing annotation
const updateAnnotation = (shape) => {
  // Find existing annotation
  let annotation = annotations.value.find((anno) => anno.attrs.shapeId === shape.id());
  
  if (!annotation) {
    // Create new if it doesn't exist
    annotation = createAnnotation(shape);
    return;
  }
  
  // Update the text
  const text = getAnnotationText(shape);
  if (!text) return;
  
  // Get the Text node from the group (should be the first child)
  const textNode = annotation.findOne('Text');
  if (textNode) {
    textNode.text(text);
    textNode.offsetX(textNode.width() / 2);
  }
  
  // Update position
  const pos = getAnnotationPosition(shape);
  annotation.position(pos);
  
  layer.draw();
};

// Function to update just the annotation position without recalculating the text
const updateAnnotationPosition = (shape) => {
  const annotation = annotations.value.find((anno) => anno.attrs.shapeId === shape.id());
  if (annotation) {
    const pos = getAnnotationPosition(shape);
    annotation.position(pos);
  }
};

const getAnnotationPosition = (shape) => {
  if (shape instanceof Konva.Line) {
    const points = shape.points();
    if (points.length >= 4) {
      // For normal lines (not free draw)
      if (points.length === 4) {
        // Calculate center of the line in global coordinates
        const midX = (points[0] + points[2]) / 2;
        const midY = (points[1] + points[3]) / 2 - 10;
        
        // Apply shape's position, rotation, scale
        return {
          x: shape.x() + midX * shape.scaleX(),
          y: shape.y() + midY * shape.scaleY(),
        };
      } else {
        // For free draw lines - find center of all points
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < points.length; i += 2) {
          sumX += points[i];
          sumY += points[i + 1];
        }
        const avgX = sumX / (points.length / 2);
        const avgY = sumY / (points.length / 2) - 15;
        
        // Apply shape's transformations
        return {
          x: shape.x() + avgX * shape.scaleX(),
          y: shape.y() + avgY * shape.scaleY(),
        };
      }
    }
  } else if (shape instanceof Konva.Rect) {
    // For rectangle, position above the top center
    return {
      x: shape.x() + shape.width() * shape.scaleX() / 2,
      y: shape.y() - 10, // Position above the rectangle
    };
  } else if (shape instanceof Konva.Circle) {
    // For circle, position above the circle
    return {
      x: shape.x(),
      y: shape.y() - shape.radius() * shape.scaleY() - 10,
    };
  }
  return { x: 0, y: 0 };
};

// 
watch(showAnnotations, (newValue) => {
  annotations.value.forEach((annotation) => {
    annotation.visible(newValue);
  });
  layer?.draw();
});


const saveDrawing = async () => {

  console.log('clicked');
  

  if (!layer) {
    console.error('Konva layer not initialized.');
    return;
  }

  const drawingData = layer.toJSON(); // Get JSON representation of the layer and its children
  console.log(drawingData);
  

  try {
    // Replace '/api/save-drawing' with your actual backend endpoint URL
    const response = await fetch('http://localhost:3000/api/save-drawing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary authentication headers here (e.g., 'Authorization': 'Bearer YOUR_TOKEN')
      },
      body: drawingData, // Send the JSON string directly
    });

    if (response.ok) {
      const result = await response.json(); // Assuming your backend returns a JSON response
      console.log('Drawing saved successfully:', result);
      alert('Drawing saved successfully!'); // Or use a more sophisticated notification
    } else {
      console.error('Failed to save drawing:', response.status, response.statusText);
      alert('Failed to save drawing. Please try again.');
    }
  } catch (error) {
    console.error('Error during save request:', error);
    alert('An error occurred while saving the drawing.');
  }
};



</script>

<style scoped>
body {
  margin: 0;
  overflow: hidden;
  background-color: #f0f2f5;
}
#app {
  display: flex;
  height: 100vh;
}
#toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 10;
}
#toolbar button {
  margin-bottom: 10px;
  padding: 8px 12px;
  cursor: pointer;
  width: 100px;
  text-align: left;
}
#toolbar label {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}
#container {
  flex-grow: 1;
  width: 100%;
  height: 100%;
}
#konva-holder {
  width: 100%;
  height: 100%;
}
.konvajs-content {
  width: 100%;
  height: 100%;
}
</style> 

