const mongoose = require('mongoose');

/**
 * Asteroid Schema for storing NEO data
 * Stores risk assessments and close approach data
 */
const asteroidSchema = new mongoose.Schema({
    // NASA NEO reference ID
    neoReferenceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    designation: {
        type: String,
        default: ''
    },
    // Physical characteristics
    estimatedDiameter: {
        kilometers: {
            estimatedDiameterMin: Number,
            estimatedDiameterMax: Number
        },
        meters: {
            estimatedDiameterMin: Number,
            estimatedDiameterMax: Number
        },
        miles: {
            estimatedDiameterMin: Number,
            estimatedDiameterMax: Number
        }
    },
    // Velocity data
    relativeVelocity: {
        kilometersPerSecond: String,
        kilometersPerHour: String,
        milesPerHour: String
    },
    // Distance data
    missDistance: {
        astronomical: String,
        lunar: String,
        kilometers: String,
        miles: String
    },
    // Close approach data
    closeApproachDate: {
        type: Date,
        index: true
    },
    closeApproachDateFull: String,
    orbitingBody: {
        type: String,
        default: 'Earth'
    },
    // Hazard assessment
    isPotentiallyHazardous: {
        type: Boolean,
        default: false,
        index: true
    },
    isSentryObject: {
        type: Boolean,
        default: false
    },
    // Risk assessment (calculated by our engine)
    riskAssessment: {
        score: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        category: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'low'
        },
        factors: {
            sizeScore: Number,
            velocityScore: Number,
            missDistanceScore: Number,
            hazardFlagScore: Number
        },
        calculatedAt: {
            type: Date,
            default: Date.now
        }
    },
    // Orbital data
    orbitalData: {
        orbitId: String,
        orbitDeterminationDate: String,
        firstObservationDate: String,
        lastObservationDate: String,
        dataArcInDays: Number,
        observationsUsed: Number,
        minimumOrbitIntersection: String,
        eccentricty: String,
        semiMajorAxis: String,
        inclination: String,
        perihelionDistance: String,
        aphelionDistance: String,
        perihelionTime: String,
        meanAnomaly: String,
        meanMotion: String,
        equinox: String
    },
    // Data source tracking
    dataSource: {
        type: String,
        default: 'NASA NeoWs API'
    },
    lastFetched: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
asteroidSchema.index({ 'riskAssessment.category': 1, closeApproachDate: 1 });
asteroidSchema.index({ isPotentiallyHazardous: 1, closeApproachDate: 1 });
asteroidSchema.index({ 'estimatedDiameter.kilometers.estimatedDiameterMax': -1 });

// Virtual for average diameter in km
asteroidSchema.virtual('avgDiameterKm').get(function () {
    const km = this.estimatedDiameter?.kilometers;
    if (km) {
        return (km.estimatedDiameterMin + km.estimatedDiameterMax) / 2;
    }
    return null;
});

// Virtual for velocity in km/s as number
asteroidSchema.virtual('velocityKmPerSec').get(function () {
    return parseFloat(this.relativeVelocity?.kilometersPerSecond) || 0;
});

// Static method to find hazardous asteroids
asteroidSchema.statics.findHazardous = function (limit = 50) {
    return this.find({ isPotentiallyHazardous: true })
        .sort({ 'riskAssessment.score': -1 })
        .limit(limit);
};

// Static method to find upcoming close approaches
asteroidSchema.statics.findUpcomingCloseApproaches = function (days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        closeApproachDate: {
            $gte: new Date(),
            $lte: futureDate
        }
    }).sort({ closeApproachDate: 1 });
};

// Static method to find high-risk asteroids
asteroidSchema.statics.findHighRisk = function () {
    return this.find({
        $or: [
            { 'riskAssessment.category': 'high' },
            { 'riskAssessment.category': 'critical' },
            { isPotentiallyHazardous: true }
        ]
    }).sort({ 'riskAssessment.score': -1 });
};

// Ensure virtuals are included in JSON output
asteroidSchema.set('toJSON', { virtuals: true });
asteroidSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Asteroid', asteroidSchema);
