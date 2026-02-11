const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User Schema for Cosmic Watch
 * Handles authentication and user preferences
 */
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['user', 'researcher', 'admin'],
        default: 'user'
    },
    // User preferences for alerts
    preferences: {
        riskThreshold: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        minAsteroidSizeKm: {
            type: Number,
            default: 0.1
        },
        maxMissDistanceKm: {
            type: Number,
            default: 10000000
        },
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: false
        }
    },
    // Watched asteroids (saved by user)
    watchedAsteroids: [{
        asteroidId: {
            type: String,
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        notes: String
    }],
    // Track user activity
    lastLogin: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id,
            username: this.username,
            role: this.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Check if asteroid is in watchlist
userSchema.methods.isAsteroidWatched = function (asteroidId) {
    return this.watchedAsteroids.some(w => w.asteroidId === asteroidId);
};

// Add asteroid to watchlist
userSchema.methods.addToWatchlist = function (asteroidId, notes = '') {
    if (!this.isAsteroidWatched(asteroidId)) {
        this.watchedAsteroids.push({ asteroidId, notes });
        return this.save();
    }
    return Promise.resolve(this);
};

// Remove asteroid from watchlist
userSchema.methods.removeFromWatchlist = function (asteroidId) {
    this.watchedAsteroids = this.watchedAsteroids.filter(w => w.asteroidId !== asteroidId);
    return this.save();
};

module.exports = mongoose.model('User', userSchema);
