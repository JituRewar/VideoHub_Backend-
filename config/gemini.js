import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    // This system instruction defines the 'personality' of your AI
    systemInstruction: "You are the AI Assistant for VideoHub. Help users with video scripts, YouTube titles, and channel growth strategies."
});