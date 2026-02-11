const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const Asteroid = require('../models/Asteroid');

/**
 * GET /api/chat/:asteroidId/messages
 * Get chat messages for an asteroid
 */
router.get('/:asteroidId/messages', async (req, res) => {
    try {
        const { asteroidId } = req.params;
        const { limit = 50, before } = req.query;

        const query = {
            asteroidId,
            deleted: false,
            messageType: { $ne: 'system' }
        };

        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await ChatMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'username avatar')
            .populate('replyTo', 'message username createdAt');

        res.json({
            success: true,
            count: messages.length,
            messages: messages.reverse()
        });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});

/**
 * POST /api/chat/:asteroidId/messages
 * Send a new message to an asteroid chat
 */
router.post('/:asteroidId/messages', auth, async (req, res) => {
    try {
        const { asteroidId } = req.params;
        const { message, replyTo } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Message too long (max 2000 characters)'
            });
        }

        // Verify asteroid exists
        const asteroid = await Asteroid.findById(asteroidId);
        if (!asteroid) {
            return res.status(404).json({
                success: false,
                message: 'Asteroid not found'
            });
        }

        // Create message
        const chatMessage = new ChatMessage({
            asteroidId,
            neoReferenceId: asteroid.neoReferenceId,
            asteroidName: asteroid.name,
            userId: req.user.id,
            username: req.user.username,
            userAvatar: req.user.avatar,
            message: message.trim(),
            replyTo: replyTo || null
        });

        await chatMessage.save();
        await chatMessage.populate('userId', 'username avatar');

        res.status(201).json({
            success: true,
            message: chatMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

/**
 * DELETE /api/chat/messages/:messageId
 * Delete a message
 */
router.delete('/messages/:messageId', auth, async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await ChatMessage.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Only allow user to delete their own messages
        if (message.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own messages'
            });
        }

        message.deleted = true;
        message.deletedAt = new Date();
        await message.save();

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
});

/**
 * GET /api/chat/:asteroidId/count
 * Get message count for an asteroid
 */
router.get('/:asteroidId/count', async (req, res) => {
    try {
        const { asteroidId } = req.params;

        const count = await ChatMessage.getMessageCount(asteroidId);

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error fetching message count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch message count'
        });
    }
});

/**
 * POST /api/chat/messages/:messageId/reactions
 * Add a reaction to a message
 */
router.post('/messages/:messageId/reactions', auth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({
                success: false,
                message: 'Emoji is required'
            });
        }

        const message = await ChatMessage.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
            r => r.userId.toString() !== req.user.id.toString()
        );

        // Add new reaction
        message.reactions.push({
            emoji,
            userId: req.user.id,
            createdAt: new Date()
        });

        await message.save();

        res.json({
            success: true,
            reactions: message.reactions
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add reaction'
        });
    }
});

module.exports = router;
