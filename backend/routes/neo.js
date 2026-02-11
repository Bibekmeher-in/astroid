/**
 * Cosmic Watch - NEO (Near-Earth Object) Routes
 * Handles all asteroid data endpoints
 */

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const nasaApi = require('../services/nasaApi');
const riskAnalysis = require('../utils/riskAnalysis');
const Asteroid = require('../models/Asteroid');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/neo/feed
 * @desc    Get asteroid feed for a date range
 * @access  Public
 */
router.get('/feed', optionalAuth, [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format (YYYY-MM-DD)'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format (YYYY-MM-DD)'),
    query('hazardous')
        .optional()
        .isBoolean()
        .withMessage('Hazardous must be true or false'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
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

        // Default to current week
        const today = new Date();
        const startDate = req.query.startDate || today.toISOString().split('T')[0];
        const endDate = req.query.endDate || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const limit = parseInt(req.query.limit) || 50;

        // Fetch from NASA API
        const nasaResult = await nasaApi.getNeoFeed(startDate, endDate);

        if (!nasaResult.success) {
            throw new Error(nasaResult.error);
        }

        // Process and enrich asteroids with risk assessments
        let asteroids = Object.values(nasaResult.data.nearEarthObjects).flat();

        // Filter by hazardous if requested
        if (req.query.hazardous === 'true') {
            asteroids = asteroids.filter(a => a.is_potentially_hazardous_asteroid);
        }

        // Limit results
        asteroids = asteroids.slice(0, limit);

        // Add risk assessments
        const enrichedAsteroids = asteroids.map(asteroid => {
            const riskAssessment = riskAnalysis.calculateRiskScore(asteroid);
            return {
                ...asteroid,
                riskAssessment,
                riskSummary: riskAnalysis.generateSummary(asteroid, riskAssessment)
            };
        });

        // Sort by risk score (highest first)
        enrichedAsteroids.sort((a, b) => b.riskAssessment.score - a.riskAssessment.score);

        res.json({
            success: true,
            data: {
                count: enrichedAsteroids.length,
                dateRange: { startDate, endDate },
                asteroids: enrichedAsteroids
            }
        });
    } catch (error) {
        console.error('Neo Feed Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch asteroid feed',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/neo/lookup/:id
 * @desc    Get single asteroid by ID
 * @access  Public
 */
router.get('/lookup/:id', optionalAuth, [
    param('id')
        .notEmpty()
        .withMessage('Asteroid ID is required')
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

        const { id } = req.params;

        // Try to get from database first
        let asteroid = await Asteroid.findOne({ neoReferenceId: id });

        if (!asteroid) {
            // Fetch from NASA API
            const nasaResult = await nasaApi.getAsteroidById(id);

            if (!nasaResult || !nasaResult.success) {
                return res.status(404).json({
                    success: false,
                    message: 'Asteroid not found',
                    error: nasaResult?.error || 'Unknown error'
                });
            }

            asteroid = nasaResult.data;
        }

        // Calculate risk assessment
        const riskAssessment = riskAnalysis.calculateRiskScore(asteroid);
        const riskSummary = riskAnalysis.generateSummary(asteroid, riskAssessment);

        // Check if user is watching this asteroid
        let isWatched = false;
        if (req.user) {
            isWatched = req.user.isAsteroidWatched(id);
        }

        res.json({
            success: true,
            data: {
                ...asteroid,
                riskAssessment,
                riskSummary,
                isWatched
            }
        });
    } catch (error) {
        console.error('Neo Lookup Error:', error);
        res.status(500).json({
            success: false,
            message: error.message.includes('not found')
                ? 'Asteroid not found'
                : 'Failed to fetch asteroid',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/neo/hazardous
 * @desc    Get potentially hazardous asteroids
 * @access  Public
 */
router.get('/hazardous', optionalAuth, [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
], async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const result = await nasaApi.getHazardousAsteroids();

        // Limit and enrich with risk assessments
        const hazardousAsteroids = result.data
            .slice(0, limit)
            .map(asteroid => ({
                ...asteroid,
                riskAssessment: riskAnalysis.calculateRiskScore(asteroid)
            }))
            .sort((a, b) => b.riskAssessment.score - a.riskAssessment.score);

        res.json({
            success: true,
            data: {
                count: hazardousAsteroids.length,
                asteroids: hazardousAsteroids
            }
        });
    } catch (error) {
        console.error('Hazardous Asteroids Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hazardous asteroids',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/neo/upcoming
 * @desc    Get upcoming close approaches (next 7 days)
 * @access  Public
 */
router.get('/upcoming', optionalAuth, async (req, res) => {
    try {
        const result = await nasaApi.getUpcomingCloseApproaches();

        // Enrich with risk assessments
        const upcomingAsteroids = result.data.map(asteroid => {
            const riskAssessment = riskAnalysis.calculateRiskScore(asteroid);
            return {
                ...asteroid,
                riskAssessment
            };
        });

        res.json({
            success: true,
            data: {
                count: upcomingAsteroids.length,
                asteroids: upcomingAsteroids
            }
        });
    } catch (error) {
        console.error('Upcoming Close Approaches Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming close approaches',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/neo/stats
 * @desc    Get asteroid statistics for dashboard
 * @access  Public
 */
router.get('/stats', optionalAuth, async (req, res) => {
    try {
        const today = new Date();
        const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const result = await nasaApi.getNeoFeed(startDateStr, endDateStr);

        if (!result || !result.success || !result.data || !result.data.nearEarthObjects) {
            throw new Error(result?.error || 'Invalid Neo Feed response');
        }

        const allAsteroids = Object.values(result.data.nearEarthObjects).flat();

        // Calculate statistics
        const stats = {
            totalAsteroids: allAsteroids.length,
            hazardousCount: allAsteroids.filter(a => a.is_potentially_hazardous_asteroid).length,
            closeApproaches: allAsteroids.filter(a => {
                const missDistance = parseFloat(a.close_approach_data?.[0]?.miss_distance?.kilometers) || Infinity;
                return missDistance < 5000000; // Within 5M km
            }).length,
            largestAsteroid: null,
            fastestAsteroid: null,
            closestApproach: null,
            riskDistribution: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            }
        };

        // Find largest, fastest, closest
        let largestSize = 0;
        let fastestVelocity = 0;
        let closestDistance = Infinity;

        allAsteroids.forEach(asteroid => {
            // Risk assessment
            const risk = riskAnalysis.calculateRiskScore(asteroid);
            stats.riskDistribution[risk.category]++;

            // Size
            const diameter = asteroid.estimated_diameter?.kilometers?.estimated_diameter_max || 0;
            if (diameter > largestSize) {
                largestSize = diameter;
                stats.largestAsteroid = {
                    id: asteroid.id,
                    name: asteroid.name,
                    diameterKm: diameter
                };
            }

            // Velocity
            const velocity = parseFloat(asteroid.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second) || 0;
            if (velocity > fastestVelocity) {
                fastestVelocity = velocity;
                stats.fastestAsteroid = {
                    id: asteroid.id,
                    name: asteroid.name,
                    velocityKmS: velocity
                };
            }

            // Distance
            const distance = parseFloat(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers) || Infinity;
            if (distance < closestDistance) {
                closestDistance = distance;
                stats.closestApproach = {
                    id: asteroid.id,
                    name: asteroid.name,
                    distanceKm: distance,
                    date: asteroid.close_approach_data?.[0]?.close_approach_date
                };
            }
        });

        res.json({
            success: true,
            data: {
                period: { startDate: startDateStr, endDate: endDateStr },
                stats
            }
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/neo/risk-analysis/:id
 * @desc    Get detailed risk analysis for an asteroid
 * @access  Public
 */
router.get('/risk-analysis/:id', optionalAuth, [
    param('id')
        .notEmpty()
        .withMessage('Asteroid ID is required')
], async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 Fetching risk analysis for asteroid: ${id}`);

        const nasaResult = await nasaApi.getAsteroidById(id);

        if (!nasaResult || !nasaResult.success) {
            console.error(`❌ NASA API failed for asteroid ${id}:`, nasaResult?.error);
            return res.status(404).json({
                success: false,
                message: 'Asteroid not found',
                error: nasaResult?.error || 'Unknown error'
            });
        }

        const asteroid = nasaResult.data;

        // Validate asteroid data structure
        if (!asteroid || !asteroid.id) {
            console.error(`❌ Invalid asteroid data received for ID ${id}`);
            return res.status(500).json({
                success: false,
                message: 'Invalid asteroid data received',
                error: 'Asteroid data is missing or malformed'
            });
        }

        console.log(`✅ Asteroid data received: ${asteroid.name}`);

        // Calculate risk assessment with error handling
        let riskAssessment;
        try {
            riskAssessment = riskAnalysis.calculateRiskScore(asteroid);
        } catch (riskError) {
            console.error(`❌ Risk calculation error for asteroid ${id}:`, riskError);
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate risk assessment',
                error: riskError.message
            });
        }

        let riskSummary;
        try {
            riskSummary = riskAnalysis.generateSummary(asteroid, riskAssessment);
        } catch (summaryError) {
            console.error(`❌ Risk summary error for asteroid ${id}:`, summaryError);
            // Use a fallback summary
            riskSummary = {
                overallRisk: riskAssessment.category,
                score: riskAssessment.score,
                primaryRiskFactor: { factor: 'unknown', score: 0 },
                isPotentiallyHazardous: asteroid.is_potentially_hazardous_asteroid,
                recommendations: ['Routine monitoring only']
            };
        }

        const categoryDisplay = riskAnalysis.getCategoryDisplay(riskAssessment.category);

        res.json({
            success: true,
            data: {
                asteroid: {
                    id: asteroid.id,
                    name: asteroid.name,
                    designation: asteroid.designation,
                    estimatedDiameter: asteroid.estimated_diameter,
                    closeApproachData: asteroid.close_approach_data
                },
                riskAssessment,
                riskSummary,
                categoryDisplay
            }
        });
    } catch (error) {
        console.error('Risk Analysis Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate risk analysis',
            error: error.message
        });
    }
});

module.exports = router;
