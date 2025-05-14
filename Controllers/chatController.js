import Chat from '../Models/Chat.js';
import User from '../Models/user.js';
import mongoose from 'mongoose';

// Get conversations for current user (admin or supplier)
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = {};
        if (userRole === 'admin') {
            query = { 'participants.admin': userId };
        } else if (userRole === 'supplier' || userRole === 'company') {
            query = { 'participants.supplier': userId };
        } else {
            return res.status(403).json({ message: 'Unauthorized role for chat access' });
        }

        const conversations = await Chat.find(query)
            .populate('participants.supplier', 'name email company role')
            .populate('participants.admin', 'name email')
            .sort({ updatedAt: -1 });

        return res.status(200).json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get single conversation by ID
export const getConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        const conversation = await Chat.findById(conversationId)
            .populate('participants.supplier', 'name email company role')
            .populate('participants.admin', 'name email');

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Check if user is part of the conversation
        const isParticipant =
            conversation.participants.admin.toString() === userId ||
            conversation.participants.supplier.toString() === userId;

        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to view this conversation' });
        }

        return res.status(200).json({ conversation });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create a new conversation
export const createConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: 'Invalid receiver ID' });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        // Set participants based on roles
        let participants = {};
        if (userRole === 'admin' && (receiver.role === 'supplier' || receiver.role === 'company')) {
            participants = {
                admin: userId,
                supplier: receiverId
            };
        } else if ((userRole === 'supplier' || userRole === 'company') && receiver.role === 'admin') {
            participants = {
                supplier: userId,
                admin: receiverId
            };
        } else {
            return res.status(400).json({
                message: 'Invalid conversation participants. Only admin-supplier conversations are allowed.'
            });
        }

        // Check if conversation already exists
        const existingConversation = await Chat.findOne({
            'participants.admin': participants.admin,
            'participants.supplier': participants.supplier
        });

        if (existingConversation) {
            return res.status(200).json({
                message: 'Conversation already exists',
                conversation: existingConversation
            });
        }

        // Create new conversation
        const newConversation = await Chat.create({
            participants,
            messages: [],
            unreadCount: {
                supplier: 0,
                admin: 0
            },
            lastMessage: null
        });

        const populatedConversation = await Chat.findById(newConversation._id)
            .populate('participants.supplier', 'name email company role')
            .populate('participants.admin', 'name email');

        return res.status(201).json({
            message: 'Conversation created successfully',
            conversation: populatedConversation
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        const conversation = await Chat.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Check if user is part of the conversation
        const isParticipant =
            conversation.participants.admin.toString() === userId ||
            conversation.participants.supplier.toString() === userId;

        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to view these messages' });
        }

        return res.status(200).json({ messages: conversation.messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Send a message in a conversation
export const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Message content cannot be empty' });
        }

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        const conversation = await Chat.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Check if user is part of the conversation
        const isParticipant =
            conversation.participants.admin.toString() === userId ||
            conversation.participants.supplier.toString() === userId;

        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to send messages in this conversation' });
        }

        // Create new message
        const newMessage = {
            sender: userId,
            content,
            timestamp: new Date(),
            read: false
        };
        let senderRole = '';

        // Update unread count for the recipient
        if (userRole === 'admin') {
            senderRole = 'admin';
            conversation.unreadCount.supplier += 1;
        } else {
            senderRole = 'supplier';
            conversation.unreadCount.admin += 1;
        }

        // Update last message
        conversation.lastMessage = {
            content,
            timestamp: new Date(),
            sender: senderRole
        };

        // Add message to conversation
        conversation.messages.push(newMessage);

        await conversation.save();

        return res.status(201).json({
            message: 'Message sent successfully',
            newMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        const conversation = await Chat.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Check if user is part of the conversation
        const isParticipant =
            conversation.participants.admin.toString() === userId ||
            conversation.participants.supplier.toString() === userId;

        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to update this conversation' });
        }

        // Reset unread count for the current user
        if (userRole === 'admin') {
            conversation.unreadCount.admin = 0;
            // Mark messages from supplier as read
            conversation.messages.forEach(message => {
                if (message.sender.toString() !== userId) {
                    message.read = true;
                }
            });
        } else if (userRole === 'supplier' || userRole === 'company') {
            conversation.unreadCount.supplier = 0;
            // Mark messages from admin as read
            conversation.messages.forEach(message => {
                if (message.sender.toString() !== userId) {
                    message.read = true;
                }
            });
        }

        await conversation.save();

        return res.status(200).json({
            message: 'Messages marked as read',
            conversation
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get unread message counts for current user
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = {};
        if (userRole === 'admin') {
            query = { 'participants.admin': userId, 'unreadCount.admin': { $gt: 0 } };
        } else if (userRole === 'supplier' || userRole === 'company') {
            query = { 'participants.supplier': userId, 'unreadCount.supplier': { $gt: 0 } };
        } else {
            return res.status(403).json({ message: 'Unauthorized role for chat access' });
        }

        const conversations = await Chat.find(query);

        let totalUnread = 0;
        conversations.forEach(conversation => {
            if (userRole === 'admin' || userRole === 'company') {
                totalUnread += conversation.unreadCount.admin;
            } else {
                totalUnread += conversation.unreadCount.supplier;
            }
        });

        return res.status(200).json({
            totalUnread,
            conversationsWithUnread: conversations.length
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}; 