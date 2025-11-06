const express = require('express');
require('dotenv').config(); 
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 


const authRoutes = require('./routes/authRoutes');
const User = require('./models/userModel');  


const app = express();
const server = http.createServer(app);
const io = socketio(server);

const MONGO_URI = process.env.MONGO_URI; 
const PORT = process.env.PORT || 3000; 


if (!MONGO_URI) {
    console.error(" ERROR: MONGO_URI is not defined in .env file! Please check your .env file syntax and location.");
    process.exit(1); 
}


app.use(express.json()); 



const MessageSchema = new mongoose.Schema({
    username: String, 
    room: String,     
    message: String,
    userId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);



app.use('/api/v1/auth', authRoutes);


mongoose.connect(MONGO_URI)
    .then(() => {
        console.log(' MongoDB connected successfully.');
        
        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.log(' MongoDB connection error:', err);
        process.exit(1); 
    });


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});

 
io.use(async (socket, next) => {
    
    const token = socket.handshake.auth.token; 
    const secret = process.env.JWT_SECRET || 'your_secret_key_from_env';

    if (!token) {
        return next(new Error('Authentication failed: Token missing'));
    }

    try {
        
        const decoded = jwt.verify(token, secret);

    
        const user = await User.findById(decoded.id);

        if (!user) {
            return next(new Error('Authentication failed: User not found'));
        }

    
        socket.user = {
            id: user._id.toString(),
            username: user.username,
            room: ''
        };

        next(); 

    } catch (e) {
        console.error("Socket Auth Error:", e.message);
        
        next(new Error('Authentication failed: Invalid or Expired Token')); 
    }
});


io.on('connection', async (socket) => {

    const user = socket.user; 
    
    

    socket.on('join room', async ({ room }) => { 
        if (!room) return; 

        socket.join(room); 
        user.room = room;

        const welcomeMsg = `User ${user.username} joined the room: ${room}`;
        io.to(room).emit('status update', welcomeMsg); 

        
        try {
        
            const messages = await Message.find({ room }).sort({ createdAt: 1 }).limit(50);
            socket.emit('message history', messages); 
        } catch (e) {
            console.error("Error loading message history:", e);
        }
    });

    
    socket.on('chat message', async (msg) => {

        if (!user || !user.room || !msg.trim()) return; 


        try {
            const newMessage = new Message({ 
                username: user.username, 
                room: user.room,     
                message: msg,
                userId: user.id 
            });
            await newMessage.save();
            
            
            io.to(user.room).emit('chat message', { username: user.username, message: msg, userId: user.id }); 
            
        } catch (e) {
             console.error("Error saving message:", e);
        }
    });

    
    
    socket.on('disconnect', () => {
        
        if (user && user.room) {
            const disconnectMsg = `User ${user.username} left the chat.`;
            io.to(user.room).emit('status update', disconnectMsg); 
        }});});
