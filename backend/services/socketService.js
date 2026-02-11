const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');

/**
 * Socket.io service for real-time asteroid chat
 * Handles connection/disconnection and message events
 */
module.exports = (io) => {
    // Store connected users by socket ID
    const connectedUsers = new Map();

    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token) {
                // Allow anonymous connections for viewing chat
                socket.userId = null;
                socket.username = 'Guest';
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await User.findById(decoded.id).select('username avatar');

            if (user) {
                socket.userId = user._id;
                socket.username = user.username;
                socket.userAvatar = user.avatar;
            } else {
                socket.userId = null;
                socket.username = 'Guest';
            }

            next();
        } catch (error) {
            // Allow connection even if auth fails (guest mode)
            socket.userId = null;
            socket.username = 'Guest';
            next();
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.username} (${socket.id})`);

        // Store user connection
        connectedUsers.set(socket.id, {
            id: socket.userId,
            username: socket.username,
            avatar: socket.userAvatar,
            socketId: socket.id,
            joinedAt: new Date()
        });

        // Join asteroid chat room
        socket.on('joinAsteroid', async (data) => {
            const { asteroidId, neoReferenceId, asteroidName } = data;

            // Leave any previous asteroid rooms
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room.startsWith('asteroid:') && room !== `asteroid:${asteroidId}`) {
                    socket.leave(room);
                }
            });

            // Join the new asteroid room
            const roomName = `asteroid:${asteroidId}`;
            socket.join(roomName);

            // Store current asteroid on socket
            socket.currentAsteroid = asteroidId;
            socket.currentRoom = roomName;

            console.log(`${socket.username} joined asteroid chat: ${asteroidName} (${asteroidId})`);

            // Send chat history
            try {
                const history = await ChatMessage.getChatHistory(asteroidId, 50);
                socket.emit('chatHistory', { messages: history.reverse() });
            } catch (error) {
                console.error('Error fetching chat history:', error);
                socket.emit('chatHistory', { messages: [] });
            }

            // Notify room members
            socket.to(roomName).emit('userJoined', {
                username: socket.username,
                message: `${socket.username} joined the discussion`
            });

            // Send active users count
            io.to(roomName).emit('activeUsers', {
                count: io.sockets.adapter.rooms.get(roomName)?.size || 0
            });
        });

        // Leave asteroid chat room
        socket.on('leaveAsteroid', () => {
            if (socket.currentRoom) {
                socket.to(socket.currentRoom).emit('userLeft', {
                    username: socket.username,
                    message: `${socket.username} left the discussion`
                });

                io.to(socket.currentRoom).emit('activeUsers', {
                    count: io.sockets.adapter.rooms.get(socket.currentRoom)?.size || 0
                });

                socket.leave(socket.currentRoom);
                socket.currentRoom = null;
                socket.currentAsteroid = null;
            }
        });

        // Handle new message
        socket.on('sendMessage', async (data) => {
            const { asteroidId, neoReferenceId, asteroidName, message, replyTo } = data;

            console.log('[SOCKET DEBUG] sendMessage received:', {
                asteroidId,
                neoReferenceId,
                asteroidName,
                messageLength: message?.length,
                socketUserId: socket.userId,
                socketUsername: socket.username
            });

            // Validate required fields
            if (!asteroidId) {
                socket.emit('chatError', { message: 'Asteroid ID is missing' });
                console.log('[SOCKET DEBUG] Validation failed: asteroidId is missing');
                return;
            }

            if (!neoReferenceId) {
                socket.emit('chatError', { message: 'Neo Reference ID is missing' });
                console.log('[SOCKET DEBUG] Validation failed: neoReferenceId is missing');
                return;
            }

            // Validate message
            if (!message || message.trim().length === 0) {
                socket.emit('chatError', { message: 'Message cannot be empty' });
                return;
            }

            if (message.length > 2000) {
                socket.emit('chatError', { message: 'Message too long (max 2000 characters)' });
                return;
            }

            // Only authenticated users can send messages
            if (!socket.userId) {
                socket.emit('chatError', { message: 'Please login to send messages' });
                console.log('[SOCKET DEBUG] Auth failed: socket.userId is null');
                return;
            }

            console.log('[SOCKET DEBUG] Attempting to save message to DB...');

            try {
                // Save message to database
                const chatMessage = new ChatMessage({
                    asteroidId,
                    neoReferenceId,
                    asteroidName: asteroidName || 'Unknown',
                    userId: socket.userId,
                    username: socket.username,
                    userAvatar: socket.userAvatar,
                    message: message.trim(),
                    replyTo: replyTo || null
                });

                await chatMessage.save();
                console.log('[SOCKET DEBUG] Message saved successfully:', chatMessage._id);

                // No need to populate since username is denormalized
                const formattedMessage = {
                    ...chatMessage.toJSON(),
                    formattedTime: chatMessage.formattedTime
                };

                // Broadcast to all users in the asteroid room (including sender)
                io.to(`asteroid:${asteroidId}`).emit('newMessage', formattedMessage);

            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('chatError', { message: `Failed to send message: ${error.message}` });
            }
        });

        // Handle typing indicator
        socket.on('typing', (data) => {
            if (socket.currentRoom && socket.userId) {
                socket.to(socket.currentRoom).emit('userTyping', {
                    username: socket.username,
                    asteroidId: socket.currentAsteroid
                });
            }
        });

        // Handle stop typing
        socket.on('stopTyping', (data) => {
            if (socket.currentRoom && socket.userId) {
                socket.to(socket.currentRoom).emit('userStoppedTyping', {
                    username: socket.username,
                    asteroidId: socket.currentAsteroid
                });
            }
        });

        // Handle reaction to message
        socket.on('addReaction', async (data) => {
            const { messageId, emoji } = data;

            if (!socket.userId) {
                socket.emit('chatError', { message: 'Please login to add reactions' });
                return;
            }

            try {
                const message = await ChatMessage.findById(messageId);
                if (!message) {
                    socket.emit('chatError', { message: 'Message not found' });
                    return;
                }

                // Remove existing reaction from this user
                message.reactions = message.reactions.filter(
                    r => r.userId.toString() !== socket.userId.toString()
                );

                // Add new reaction
                message.reactions.push({
                    emoji,
                    userId: socket.userId,
                    createdAt: new Date()
                });

                await message.save();

                // Broadcast reaction update
                io.to(`asteroid:${message.asteroidId}`).emit('reactionUpdated', {
                    messageId,
                    reactions: message.reactions
                });

            } catch (error) {
                console.error('Error adding reaction:', error);
                socket.emit('chatError', { message: 'Failed to add reaction' });
            }
        });

        // Handle message deletion
        socket.on('deleteMessage', async (data) => {
            const { messageId } = data;

            if (!socket.userId) {
                socket.emit('chatError', { message: 'Please login to delete messages' });
                return;
            }

            try {
                const message = await ChatMessage.findById(messageId);
                if (!message) {
                    socket.emit('chatError', { message: 'Message not found' });
                    return;
                }

                // Only allow user to delete their own messages
                if (message.userId.toString() !== socket.userId.toString()) {
                    socket.emit('chatError', { message: 'You can only delete your own messages' });
                    return;
                }

                message.deleted = true;
                message.deletedAt = new Date();
                await message.save();

                // Broadcast deletion
                io.to(`asteroid:${message.asteroidId}`).emit('messageDeleted', {
                    messageId,
                    deletedBy: socket.username
                });

            } catch (error) {
                console.error('Error deleting message:', error);
                socket.emit('chatError', { message: 'Failed to delete message' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.username} (${socket.id})`);

            // Clean up user from connected users
            connectedUsers.delete(socket.id);

            // Notify room if user was in an asteroid chat
            if (socket.currentRoom) {
                socket.to(socket.currentRoom).emit('userLeft', {
                    username: socket.username,
                    message: `${socket.username} left the discussion`
                });

                io.to(socket.currentRoom).emit('activeUsers', {
                    count: io.sockets.adapter.rooms.get(socket.currentRoom)?.size || 0
                });
            }
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`Socket error for ${socket.username}:`, error);
        });
    });

    // Periodic cleanup of inactive connections (optional)
    setInterval(() => {
        const now = new Date();
        const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

        connectedUsers.forEach((user, socketId) => {
            if (now - user.joinedAt > inactiveThreshold) {
                connectedUsers.delete(socketId);
            }
        });
    }, 5 * 60 * 1000); // Run every 5 minutes

    console.log('✅ Socket.io service initialized');
};
