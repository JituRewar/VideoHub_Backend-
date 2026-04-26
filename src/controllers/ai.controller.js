import { Chat } from "../models/chat.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const askAI = asyncHandler(async (req, res) => {
    const { prompt, chatId } = req.body;

    if (!prompt || prompt.trim() === "") {
        throw new ApiError(400, "Prompt is required");
    }

    // 1. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are CineMind AI, a professional assistant for filmmakers and content creators. Be helpful, concise, and creative."
    });

    let chat;
    let history = [];

    // 2. Fetch existing chat and format history for Gemini
    if (chatId) {
        chat = await Chat.findById(chatId);
        if (!chat) {
            throw new ApiError(404, "Chat session not found");
        }
        // Gemini expects: { role: "user" | "model", parts: [{ text: "..." }] }
        history = chat.messages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));
    }

    // 3. Generate Content from Gemini
    let result, aiResponse;
    try {
        const chatSession = model.startChat({ history });
        result = await chatSession.sendMessage(prompt);
        aiResponse = result.response.text();
    } catch (apiError) {
        console.error("Gemini API Error Detail: ", apiError);
        throw new ApiError(500, "Failed to connect to AI Provider: " + apiError.message);
    }

    if (!aiResponse) {
        throw new ApiError(500, "Failed to generate AI response from Gemini");
    }

    // 4. Save to Database
    if (chat) {
        // Update existing chat
        chat.messages.push({ role: "user", content: prompt });
        chat.messages.push({ role: "assistant", content: aiResponse });
        await chat.save();
    } else {
        // Create new chat
        chat = await Chat.create({
            owner: req.user?._id,
            title: prompt.substring(0, 35) + "...",
            messages: [
                { role: "user", content: prompt },
                { role: "assistant", content: aiResponse }
            ]
        });
    }

    // 5. Send Response
    // We return { chat, aiResponse } so the frontend can find result.data.chat._id
    return res.status(200).json(
        new ApiResponse(
            200, 
            { 
                chat, 
                aiResponse 
            }, 
            "AI response generated successfully"
        )
    );
});

const getChatHistory = asyncHandler(async (req, res) => {
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const chats = await Chat.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    
    return res.status(200).json(
        new ApiResponse(200, chats, "Chat history fetched successfully")
    );
});

export { askAI, getChatHistory };