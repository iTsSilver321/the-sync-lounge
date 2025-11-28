require('dotenv').config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Proven to work for your key

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- GLOBAL MEMORY ---
const roomLikes = {}; 
const mindMeldAnswers = {}; 
const roomDrawings = {}; 
const roomMovieStartPage = {}; 
const processingLocks = new Set(); // Stores roomIDs that are currently generating (The Anti-Spam Fix)

io.on('connection', (socket) => {
  console.log(`⚡: User connected ${socket.id}`);

  // JOIN ROOM
  socket.on('join_room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size >= 2) {
      socket.emit('room:error', "Room is full! Only 2 lovers allowed.");
      return; 
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    
    // Sync Movie Page & Canvas History
    if (!roomMovieStartPage[roomId]) roomMovieStartPage[roomId] = Math.floor(Math.random() * 20) + 1;
    socket.emit('movie:sync_page', { page: roomMovieStartPage[roomId] });
    if (roomDrawings[roomId]) socket.emit('canvas:history', roomDrawings[roomId]);
  });

  // --- MODULE B: MIND MELD (AI & Debounce) ---
  socket.on('mind:generate_question', async (vibe) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    
    if (processingLocks.has(roomId)) {
      console.log("⚠️ Ignored duplicate AI request (Debounced)");
      return;
    }
    processingLocks.add(roomId);

    try {
      const prompt = `Generate a single, short question for a couple. Vibe: ${vibe}. Text only.`;
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      io.to(roomId).emit('mind:new_question', question);
    } catch (error) {
      console.error("❌ AI Error:", error.message); // Will log 429 if rate limited
      io.to(roomId).emit('mind:new_question', "What is your favorite memory of us?");
    } finally {
        setTimeout(() => processingLocks.delete(roomId), 2000); // Release lock
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
      if (mindMeldAnswers[ids[0]] && mindMeldAnswers[ids[1]]) {
        io.to(ids[0]).emit('mind:reveal', { answer: mindMeldAnswers[ids[1]] });
        io.to(ids[1]).emit('mind:reveal', { answer: mindMeldAnswers[ids[0]] });
        delete mindMeldAnswers[ids[0]]; delete mindMeldAnswers[ids[1]];
      }
    }
  });

  // --- MODULE D: TRUTH OR DARE (AI & Debounce) ---
  socket.on('truth:generate', async ({ type, intensity }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    
    if (processingLocks.has(roomId)) return;
    processingLocks.add(roomId);

    try {
      const prompt = `Generate a ${type} challenge for a couple. Intensity: ${intensity}. Text only.`;
      const result = await model.generateContent(prompt);
      const challenge = result.response.text().trim();
      io.to(roomId).emit('truth:new_challenge', { text: challenge, type });
    } catch (error) {
      console.error("❌ AI Error:", error.message);
      io.to(roomId).emit('truth:new_challenge', { 
        text: "Tell your partner something you love.", 
        type: "truth" 
      });
    } finally {
        setTimeout(() => processingLocks.delete(roomId), 2000); // Release lock
    }
  });

  // --- OTHER MODULES ---
  socket.on('mind:typing', (isTyping) => {
    const roomId = socket.data.roomId;
    if (roomId) socket.broadcast.to(roomId).emit('mind:partner_typing', isTyping);
  });
  socket.on('movie:swipe', ({ movieId, direction }) => {
    const roomId = socket.data.roomId; 
    if (!roomId) return;
    if (direction === 'right') {
      if (!roomLikes[roomId]) roomLikes[roomId] = {};
      if (!roomLikes[roomId][movieId]) roomLikes[roomId][movieId] = [];
      const movieLikes = roomLikes[roomId][movieId];
      if (!movieLikes.includes(socket.id)) movieLikes.push(socket.id);
      if (movieLikes.length >= 2) io.to(roomId).emit('movie:match_found', { movieId });
    }
  });
  socket.on('canvas:draw', (data) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      if (!roomDrawings[roomId]) roomDrawings[roomId] = {};
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

  // DISCONNECT
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