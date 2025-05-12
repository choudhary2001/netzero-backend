import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './Models/user.js';
import Chat from './Models/Chat.js';

let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.user._id);

        // Handle joining a conversation
        socket.on('join_conversation', async (conversationId) => {
            try {
                const conversation = await Chat.findById(conversationId);
                if (!conversation) {
                    return socket.emit('error', 'Conversation not found');
                }

                // Check if user is part of the conversation
                const isParticipant =
                    conversation.participants.admin.toString() === socket.user._id.toString() ||
                    conversation.participants.supplier.toString() === socket.user._id.toString();

                if (!isParticipant) {
                    return socket.emit('error', 'Not authorized to join this conversation');
                }

                // Leave any existing conversation rooms
                socket.rooms.forEach(room => {
                    if (room !== socket.id) {
                        socket.leave(room);
                    }
                });

                // Join the conversation room
                socket.join(conversationId);
                console.log(`User ${socket.user._id} joined conversation ${conversationId}`);
            } catch (error) {
                console.error('Error joining conversation:', error);
                socket.emit('error', 'Error joining conversation');
            }
        });

        // Handle leaving a conversation
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(conversationId);
            console.log(`User ${socket.user._id} left conversation ${conversationId}`);
        });

        // Handle sending a message
        socket.on('message', async (data) => {
            try {
                const { conversationId, content } = data;
                if (!conversationId || !content) {
                    return socket.emit('error', 'Invalid message data');
                }

                const conversation = await Chat.findById(conversationId);
                if (!conversation) {
                    return socket.emit('error', 'Conversation not found');
                }

                // Check if user is part of the conversation
                const isParticipant =
                    conversation.participants.admin.toString() === socket.user._id.toString() ||
                    conversation.participants.supplier.toString() === socket.user._id.toString();

                if (!isParticipant) {
                    return socket.emit('error', 'Not authorized to send messages in this conversation');
                }

                // Create new message
                const newMessage = {
                    sender: socket.user._id,
                    content,
                    timestamp: new Date(),
                    read: false
                };

                // Update unread count for the recipient
                const userRole = socket.user.role;
                if (userRole === 'admin') {
                    conversation.unreadCount.supplier += 1;
                } else {
                    conversation.unreadCount.admin += 1;
                }

                // Update last message
                conversation.lastMessage = {
                    content,
                    timestamp: new Date(),
                    sender: userRole
                };

                // Add message to conversation
                conversation.messages.push(newMessage);
                await conversation.save();

                // Broadcast the message to all users in the conversation room
                io.to(conversationId).emit('message', {
                    ...newMessage,
                    conversationId,
                    sender: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        role: socket.user.role
                    }
                });

                // Emit conversation update to all participants
                const populatedConversation = await Chat.findById(conversationId)
                    .populate('participants.supplier', 'name email company')
                    .populate('participants.admin', 'name email');

                io.to(conversationId).emit('conversation_update', populatedConversation);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', 'Error sending message');
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.user._id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}; 