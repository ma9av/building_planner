import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Drawing from './Drawing.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*', // or multiple origins in an array
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // if you need to include cookies
}));
 
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/api/save-drawing/:id', async (req, res) => {
    // 
    console.log('Received drawing:', req.body);
    const { id } = req.params;
    console.log('Drawing ID:', id);
    
    
    try {
        await mongoose.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        
        // Check if the drawing has an ID
        const drawingId = req.body.id || req.body._id;
        
        if (drawingId) {
            // If ID exists, try to update the existing drawing
            const updatedDrawing = await Drawing.findByIdAndUpdate(
                drawingId,
                { 
                    drawing: req.body,
                    updatedAt: new Date() // Track when it was updated
                },
                { new: true, upsert: true } // Return the updated document and create if it doesn't exist
            );
            
            res.status(200).send({
                message: 'Drawing updated successfully!',
                drawing: updatedDrawing
            });
        } else {
            // If no ID, create a new drawing
            const newDrawing = new Drawing({
                drawing: req.body,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await newDrawing.save();
            
            res.status(201).send({
                message: 'Drawing saved successfully!',
                drawing: newDrawing
            });
        }
    } catch (err) {
        console.error('Error in save-drawing endpoint:', err);
        res.status(500).send('Error processing drawing: ' + err.message);
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});