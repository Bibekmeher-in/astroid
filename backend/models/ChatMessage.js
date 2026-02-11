const mongoose = require('mongoose');

/**
 * ChatMessage Schema for storing asteroid discussion messages
 * Supports real-time community threads for specific asteroids
 */
const chatMessageSchema = new mongoose.Schema({
    // Reference to the asteroid being discussed
    // Can be either a MongoDB ObjectId (for saved asteroids) or neoReferenceId string (for NASA asteroids)
    asteroidId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        index: true
    },
    // NASA NEO reference ID for quick lookups
    neoReferenceId: {
        type: String,
        required: true,
        index: true
    },
    // Asteroid name for display
    asteroidName: {
        type: String,
        required: true
    },
    // The user who sent the message
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Username for display (denormalized for performance)
    username: {
        type: String,
        required: true
    },
    // User avatar URL (optional)
    userAvatar: {
        type: String,
        default: null
    },
    // The message content
    message: {
        type: String,
        required: true,
        maxlength: 2000,
        trim: true
    },
    // Message type (text, system, etc.)
    messageType: {
        type: String,
        enum: ['text', 'system', 'announcement'],
        default: 'text'
    },
    // Optional reply to another message
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
        default: null
    },
    // Reactions to the message
    reactions: [{
        emoji: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Edit history
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    // Soft delete
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
chatMessageSchema.index({ asteroidId: 1, createdAt: -1 });
chatMessageSchema.index({ asteroidId: 1, neoReferenceId: 1, createdAt: -1 });

// TTL index to auto-delete messages after 30 days (optional)
// chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Virtual for formatted timestamp
chatMessageSchema.virtual('formattedTime').get(function () {
    if (!this.createdAt) return 'Just now';
    const now = new Date();
    const messageDate = this.createdAt;
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString();
});

// Static method to get chat history for an asteroid
chatMessageSchema.statics.getChatHistory = function (asteroidId, limit = 50, beforeDate = null) {
    const query = {
        asteroidId,
        deleted: false,
        messageType: { $ne: 'system' }
    };

    if (beforeDate) {
        query.createdAt = { $lt: beforeDate };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'username avatar')
        .populate('replyTo', 'message username createdAt');
};

// Static method to get recent messages count
chatMessageSchema.statics.getMessageCount = function (asteroidId) {
    return this.countDocuments({
        asteroidId,
        deleted: false,
        messageType: { $ne: 'system' }
    });
};

// Static method for user mentions (basic implementation)
chatMessageSchema.statics.findMentions = function (asteroidId, username) {
    const mentionPattern = new RegExp(`@${username}\\b`, 'i');
    return this.find({
        asteroidId,
        message: mentionPattern,
        deleted: false
    }).populate('userId', 'username');
};

// Ensure virtuals are included in JSON output
chatMessageSchema.set('toJSON', { virtuals: true });
chatMessageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
