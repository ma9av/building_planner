import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'

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

app.post('/api/save-drawing',  ,(req, res) => {
    console.log('Received drawing:', req.body);
    
    mongoose.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
        const DrawingSchema = new mongoose.Schema({
            drawing: String,
            timestamp: { type: Date, default: Date.now }
        });

        const Drawing = mongoose.model('Drawing', DrawingSchema);

        const newDrawing = new Drawing(req.body);
        newDrawing.save().then(() => {
            res.status(201).send('Drawing saved successfully!');
        }).catch(err => {
            res.status(500).send('Error saving drawing: ' + err.message);
        });
    }).catch(err => {
        res.status(500).send('Error connecting to database: ' + err.message);
    });
})

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});