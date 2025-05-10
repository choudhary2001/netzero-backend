import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
});

const chatSchema = new mongoose.Schema({
    participants: {
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    messages: [messageSchema],
    unreadCount: {
        supplier: {
            type: Number,
            default: 0
        },
        admin: {
            type: Number,
            default: 0
        }
    },
    lastMessage: {
        content: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        sender: {
            type: String,
            enum: ['admin', 'supplier']
        }
    }
}, {
    timestamps: true
});

// Create indexes for faster queries
chatSchema.index({ 'participants.supplier': 1, 'participants.admin': 1 });
chatSchema.index({ updatedAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat; 