require('dotenv').config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using 2.5-flash. If it is slow, you can switch to "gemini-1.5-flash"
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- GLOBAL MEMORY & LOCKS ---
const roomLikes = {}; 
const mindMeldAnswers = {}; 
const roomDrawings = {}; 
const roomMovieStartPage = {}; 
const processingLocks = new Set(); 

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
    if (roomDrawings[roomId]) socket.emit('canvas:history', roomDrawings[roomId]);
    if (!roomMovieStartPage[roomId]) roomMovieStartPage[roomId] = Math.floor(Math.random() * 20) + 1;
    socket.emit('movie:sync_page', { page: roomMovieStartPage[roomId] });
  });

  // --- MODULE E: DAILY PULSE (Direct Call - No Timeout) ---
  socket.on('daily:generate', async () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    if (processingLocks.has(roomId)) return;
    processingLocks.add(roomId);

    console.log(`[AI] Generating Daily Question for ${roomId}...`);

    try {
      const prompt = "Generate one engaging, deep question for a couple to answer together today. Text only, no formatting. Max 15 words.";
      
      // DIRECT CALL (Waits as long as needed)
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      
      console.log(`[AI] Success: ${question}`);
      io.to(roomId).emit('daily:new_question', question);

    } catch (error) {
      console.error("❌ AI Error:", error.message);
      io.to(roomId).emit('daily:new_question', "What is one thing you are grateful for today?");
    } finally {
       setTimeout(() => processingLocks.delete(roomId), 2000);
    }
  });

  socket.on('daily:submit', () => {
    if (socket.data.roomId) {
        socket.broadcast.to(socket.data.roomId).emit('daily:partner_submitted');
    }
  });

  // --- MODULE B: MIND MELD (Direct Call - No Timeout) ---
  socket.on('mind:generate_question', async (vibe) => {
    const roomId = socket.data.roomId;
    if (!roomId || processingLocks.has(roomId)) return;
    processingLocks.add(roomId);
    
    console.log(`[AI] Generating Mind Meld (${vibe})...`);

    try {
      const prompt = `Generate a single, short question for a couple. Vibe: ${vibe}. Max 15 words. Text only.`;
      
      // DIRECT CALL
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      
      console.log(`[AI] Success: ${question}`);
      io.to(roomId).emit('mind:new_question', question);
    } catch (error) {
      console.error("❌ AI Error:", error.message);
      io.to(roomId).emit('mind:new_question', "What is your favorite memory of us?");
    } finally {
        setTimeout(() => processingLocks.delete(roomId), 2000); 
    }
  });

  // --- MODULE D: TRUTH OR DARE (Direct Call - No Timeout) ---
  socket.on('truth:generate', async ({ type, intensity }) => {
    const roomId = socket.data.roomId;
    if (!roomId || processingLocks.has(roomId)) return;
    processingLocks.add(roomId);

    console.log(`[AI] Generating ${type}...`);

    try {
      const prompt = `Generate a ${type} challenge for a couple. Intensity: ${intensity}. Max 15 words. Output ONLY the text.`;
      
      // DIRECT CALL
      const result = await model.generateContent(prompt);
      const challenge = result.response.text().trim();
      
      console.log(`[AI] Success: ${challenge}`);
      io.to(roomId).emit('truth:new_challenge', { text: challenge, type });
    } catch (error) {
      console.error("❌ AI Error:", error.message);
      io.to(roomId).emit('truth:new_challenge', { 
        text: "Tell your partner something you love.", 
        type: "truth" 
      });
    } finally {
        setTimeout(() => processingLocks.delete(roomId), 2000);
    }
  });

  // --- STANDARD MODULES ---
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

  socket.on('mind:typing', (isTyping) => {
    if (socket.data.roomId) socket.broadcast.to(socket.data.roomId).emit('mind:partner_typing', isTyping);
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

  socket.on('canvas:draw', (data) => {
    if (socket.data.roomId) socket.broadcast.to(socket.data.roomId).emit('canvas:draw', data);
  });
  
  socket.on('canvas:clear', () => {
    if (socket.data.roomId) io.to(socket.data.roomId).emit('canvas:clear');
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