require('dotenv').config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const roomLikes = {}; 
const mindMeldAnswers = {}; 
const roomDrawings = {}; 

io.on('connection', (socket) => {
  console.log(`⚡: User connected ${socket.id}`);

  // 1. JOIN ROOM
  socket.on('join_room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size >= 2) {
      socket.emit('room:error', "Room is full! Only 2 lovers allowed.");
      return; 
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Send Canvas History
    if (roomDrawings[roomId]) {
      socket.emit('canvas:history', roomDrawings[roomId]);
    }
  });

  // MODULE A: MOVIES
  socket.on('movie:swipe', ({ movieId, direction }) => {
    const roomId = socket.data.roomId; 
    if (!roomId) return;

    if (direction === 'right') {
      if (!roomLikes[roomId]) roomLikes[roomId] = {};
      if (!roomLikes[roomId][movieId]) roomLikes[roomId][movieId] = [];

      const movieLikes = roomLikes[roomId][movieId];
      if (!movieLikes.includes(socket.id)) movieLikes.push(socket.id);

      if (movieLikes.length >= 2) {
        io.to(roomId).emit('movie:match_found', { movieId });
      }
    }
  });

  // MODULE B: MIND MELD
  socket.on('mind:typing', (isTyping) => {
    const roomId = socket.data.roomId;
    if (roomId) socket.broadcast.to(roomId).emit('mind:partner_typing', isTyping);
  });

  socket.on('mind:generate_question', async (vibe) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    try {
      const prompt = `Generate a single, short, engaging question for a couple. Vibe: ${vibe}. Just text.`;
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      io.to(roomId).emit('mind:new_question', question);
    } catch (error) {
      io.to(roomId).emit('mind:new_question', "What is your favorite memory of us?");
    }
  });

  socket.on('mind:submit', ({ answer }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    mindMeldAnswers[socket.id] = answer;
    socket.broadcast.to(roomId).emit('mind:partner_submitted');
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size === 2) {
      const ids = Array.from(room);
      const answerA = mindMeldAnswers[ids[0]];
      const answerB = mindMeldAnswers[ids[1]];
      if (answerA && answerB) {
        io.to(ids[0]).emit('mind:reveal', { answer: answerB });
        io.to(ids[1]).emit('mind:reveal', { answer: answerA });
        delete mindMeldAnswers[ids[0]]; delete mindMeldAnswers[ids[1]];
      }
    }
  });

  // MODULE C: CANVAS
  socket.on('canvas:draw', (data) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      if (!roomDrawings[roomId]) roomDrawings[roomId] = [];
      roomDrawings[roomId].push(data);
      socket.broadcast.to(roomId).emit('canvas:draw', data);
    }
  });
  socket.on('canvas:clear', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      roomDrawings[roomId] = []; 
      io.to(roomId).emit('canvas:clear');
    }
  });

  socket.on('disconnect', () => {
    delete mindMeldAnswers[socket.id];
    const roomId = socket.data.roomId;
    if (roomId && roomLikes[roomId]) {
       Object.keys(roomLikes[roomId]).forEach(movieId => {
         roomLikes[roomId][movieId] = roomLikes[roomId][movieId].filter(id => id !== socket.id);
       });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});