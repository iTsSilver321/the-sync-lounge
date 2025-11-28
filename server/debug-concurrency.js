// server/debug-concurrency.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Configuration ---
// REPLACE THIS WITH YOUR ACTUAL KEY STRING if you are having .env issues
const API_KEY = process.env.GEMINI_API_KEY; 
const modelName = "gemini-2.5-flash"; 

if (!API_KEY) {
    console.error("❌ CRITICAL: API Key is missing. Cannot run test.");
    return;
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: modelName });

console.log(`🚀 Starting Concurrency Test for ${modelName}...`);

function simulateSocketEvent(delay, eventName) {
    console.log(`\n[EVENT: ${eventName}] Fired at ${new Date().toLocaleTimeString()} (Simulated Delay: ${delay}ms)`);
    
    // Simulate the asynchronous nature of the Socket.IO listener
    setTimeout(async () => {
        try {
            console.log("3. Sending Request to Google...");
            const result = await model.generateContent("Reply with exactly one word: Success.");
            const text = result.response.text();
            
            console.log(`✅ SUCCESS in Event ${eventName}. Result: ${text}`);
            
        } catch (error) {
            // This captures the rate limit or the silent crash
            console.error(`❌ FAILED in Event ${eventName}. Status: ${error.message}`);
        }
    }, delay);
}

// Run two events immediately to simulate the development environment double-firing.
simulateSocketEvent(10, 'MindMeld Click 1');
simulateSocketEvent(20, 'MindMeld Click 2 (Simulated Duplicate)');

// Keep the script running long enough to catch the async responses
setTimeout(() => console.log("\n--- Test Finished. ---"), 5000);