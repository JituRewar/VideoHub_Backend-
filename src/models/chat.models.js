import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    messages: [
        {
            role: { type: String, enum: ["user", "assistant"], required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

export const Chat = mongoose.model("Chat", chatSchema);