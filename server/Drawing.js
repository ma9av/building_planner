import mongoose from "mongoose";

const DrawingSchema = new mongoose.Schema({
    drawing: Object,
    timestamp: { type: Date, default: Date.now }
});

const Drawing = mongoose.model('Drawing', DrawingSchema);   

export default Drawing; 