// server/test-ai.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function runTest() {
  console.log("1. Authenticating...");
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ No API Key found. Check .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // We test the EXACT model you want to use
  const modelName = "gemini-2.5-flash"; 
  console.log(`2. Requesting '${modelName}'...`);

  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent("Explain how AI works in one sentence.");
    const response = await result.response;
    const text = response.text();
    
    console.log("---------------------------------------------------");
    console.log("✅ SUCCESS!");
    console.log("Model Used:", modelName);
    console.log("Response:", text);
    console.log("---------------------------------------------------");
  } catch (error) {
    console.error("\n❌ FAILED.");
    console.error("Error Message:", error.message);
    
    if (error.message.includes("404")) {
      console.log("\n💡 DIAGNOSIS: This model name does not exist for this API Key/SDK combo.");
      console.log("TRY THIS: Change line 13 to 'gemini-1.5-flash' and run again.");
    } else if (error.message.includes("429")) {
      console.log("\n💡 DIAGNOSIS: Rate Limit. You sent too many requests too fast.");
    }
  }
}

runTest();