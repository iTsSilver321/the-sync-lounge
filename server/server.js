require('dotenv').config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- SETUP ---
// UPDATED: Using the latest Gemini 3.0 Pro model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use 'gemini-3-pro-preview' for the best reasoning
// OR use 'gemini-2.5-flash' if you want it to be faster/cheaper
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// --- GLOBAL MEMORY ---
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

    if (roomDrawings[roomId]) {
      socket.emit('canvas:history', roomDrawings[roomId]);
    }
  });

  // --- MODULE A: MOVIES ---
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

  // --- MODULE B: MIND MELD ---
  
  // Event 1: Typing
  socket.on('mind:typing', (isTyping) => {
    const roomId = socket.data.roomId;
    if (roomId) socket.broadcast.to(roomId).emit('mind:partner_typing', isTyping);
  });

  // Event 2: Generate Question (Using Gemini 3.0 Pro)
  socket.on('mind:generate_question', async (vibe) => {
    const roomId = socket.data.roomId;
    
    console.log(`[DEBUG] Generating ${vibe} question with Gemini 3.0...`);

    if (!roomId) return;

    try {
      const prompt = `Generate a single, short, engaging question for a couple to answer simultaneously. The vibe is: ${vibe}. Do not include "Question:" label. Just the text.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const question = response.text().trim();

      console.log(`[AI SUCCESS] ${question}`);
      io.to(roomId).emit('mind:new_question', question);

    } catch (error) {
      console.error("AI Error:", error);
      // Fallback if AI fails (e.g. quota limit)
      io.to(roomId).emit('mind:new_question', "What is the most adventurous thing we should do this year?");
    }
  });

  // Event 3: Submit Answer
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
        delete mindMeldAnswers[ids[0]];
        delete mindMeldAnswers[ids[1]];
      }
    }
  });

  // --- MODULE C: CANVAS ---
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
    console.log(`🔥: User disconnected ${socket.id}`);
    delete mindMeldAnswers[socket.id];

    // FIX: Remove this user's likes from the movie memory
    // This prevents matching with your own "ghost" after a refresh
    const roomId = socket.data.roomId;
    if (roomId && roomLikes[roomId]) {
       Object.keys(roomLikes[roomId]).forEach(movieId => {
         // Filter out the disconnected user ID
         roomLikes[roomId][movieId] = roomLikes[roomId][movieId].filter(id => id !== socket.id);
       });
    }
  });
});

server.listen(3001, () => {
  console.log('SERVER RUNNING ON 3001');
});