/**
 * Cosmic Watch - User Routes
 * Handles user profile, watchlist, and preferences
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('watchedAsteroids.asteroidId', 'name neoReferenceId riskAssessment');

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', auth, [
    body('riskThreshold')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid risk threshold'),
    body('minAsteroidSizeKm')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum size must be positive'),
    body('maxMissDistanceKm')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum miss distance must be positive'),
    body('emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications must be boolean'),
    body('pushNotifications')
        .optional()
        .isBoolean()
        .withMessage('Push notifications must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { riskThreshold, minAsteroidSizeKm, maxMissDistanceKm, emailNotifications, pushNotifications } = req.body;

        const updateFields = {};
        if (riskThreshold) updateFields['preferences.riskThreshold'] = riskThreshold;
        if (minAsteroidSizeKm) updateFields['preferences.minAsteroidSizeKm'] = minAsteroidSizeKm;
        if (maxMissDistanceKm) updateFields['preferences.maxMissDistanceKm'] = maxMissDistanceKm;
        if (emailNotifications !== undefined) updateFields['preferences.emailNotifications'] = emailNotifications;
        if (pushNotifications !== undefined) updateFields['preferences.pushNotifications'] = pushNotifications;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update Preferences Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/user/watchlist/:asteroidId
 * @desc    Add asteroid to watchlist
 * @access  Private
 */
router.post('/watchlist/:asteroidId', auth, [
    body('notes')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Notes cannot exceed 200 characters')
], async (req, res) => {
    try {
        const { asteroidId } = req.params;
        const { notes } = req.body;

        if (req.user.isAsteroidWatched(asteroidId)) {
            return res.status(400).json({
                success: false,
                message: 'Asteroid already in watchlist'
            });
        }

        await req.user.addToWatchlist(asteroidId, notes);

        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('watchedAsteroids.asteroidId', 'name neoReferenceId riskAssessment');

        res.json({
            success: true,
            message: 'Asteroid added to watchlist',
            data: { watchlist: user.watchedAsteroids }
        });
    } catch (error) {
        console.error('Add to Watchlist Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add to watchlist',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/user/watchlist/:asteroidId
 * @desc    Remove asteroid from watchlist
 * @access  Private
 */
router.delete('/watchlist/:asteroidId', auth, async (req, res) => {
    try {
        const { asteroidId } = req.params;

        if (!req.user.isAsteroidWatched(asteroidId)) {
            return res.status(400).json({
                success: false,
                message: 'Asteroid not in watchlist'
            });
        }

        await req.user.removeFromWatchlist(asteroidId);

        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('watchedAsteroids.asteroidId', 'name neoReferenceId riskAssessment');

        res.json({
            success: true,
            message: 'Asteroid removed from watchlist',
            data: { watchlist: user.watchedAsteroids }
        });
    } catch (error) {
        console.error('Remove from Watchlist Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove from watchlist',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/user/watchlist
 * @desc    Get user's watchlist
 * @access  Private
 */
router.get('/watchlist', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('watchedAsteroids')
            .populate('watchedAsteroids.asteroidId', 'name neoReferenceId estimatedDiameter relativeVelocity missDistance closeApproachDate isPotentiallyHazardous riskAssessment');

        res.json({
            success: true,
            data: { watchlist: user.watchedAsteroids }
        });
    } catch (error) {
        console.error('Get Watchlist Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get watchlist',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/user/watchlist/:asteroidId/notes
 * @desc    Update notes for watched asteroid
 * @access  Private
 */
router.put('/watchlist/:asteroidId/notes', auth, [
    body('notes')
        .isLength({ max: 200 })
        .withMessage('Notes cannot exceed 200 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { asteroidId } = req.params;
        const { notes } = req.body;

        if (!req.user.isAsteroidWatched(asteroidId)) {
            return res.status(400).json({
                success: false,
                message: 'Asteroid not in watchlist'
            });
        }

        const user = await User.findOneAndUpdate(
            { _id: req.user._id, 'watchedAsteroids.asteroidId': asteroidId },
            { $set: { 'watchedAsteroids.$.notes': notes } },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Notes updated successfully',
            data: { watchlist: user.watchedAsteroids }
        });
    } catch (error) {
        console.error('Update Notes Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notes',
            error: error.message
        });
    }
});

module.exports = router;
