/**
 * Cosmic Watch - Risk Analysis Engine
 * Calculates risk scores for Near-Earth Objects based on multiple factors
 */

class RiskAnalysisEngine {
    constructor() {
        // Risk factor weights (sum to 1)
        this.weights = {
            size: 0.35,
            velocity: 0.25,
            missDistance: 0.25,
            hazardFlag: 0.15
        };

        // Thresholds for risk categorization
        this.thresholds = {
            size: {
                low: 0.1,      // < 100m
                medium: 0.5,  // 100m - 500m
                high: 1.0     // > 500m
            },
            velocity: {
                low: 20,      // < 20 km/s
                medium: 40,   // 20 - 40 km/s
                high: 60      // > 60 km/s
            },
            missDistance: {
                low: 10000000,    // > 10M km (safe)
                medium: 1000000,  // 1M - 10M km
                high: 100000      // < 1M km (close)
            }
        };
    }

    /**
     * Calculate comprehensive risk score for an asteroid
     * @param {Object} asteroid - Asteroid data from NASA API
     * @returns {Object} Risk assessment object
     */
    calculateRiskScore(asteroid) {
        const factors = {
            sizeScore: this.calculateSizeScore(asteroid),
            velocityScore: this.calculateVelocityScore(asteroid),
            missDistanceScore: this.calculateMissDistanceScore(asteroid),
            hazardFlagScore: this.calculateHazardFlagScore(asteroid)
        };

        // Calculate weighted total score (0-100)
        const totalScore = (
            factors.sizeScore * this.weights.size +
            factors.velocityScore * this.weights.velocity +
            factors.missDistanceScore * this.weights.missDistance +
            factors.hazardFlagScore * this.weights.hazardFlag
        );

        // Determine risk category
        const category = this.determineCategory(totalScore, asteroid.is_potentially_hazardous_asteroid);

        return {
            score: Math.round(totalScore),
            category,
            factors,
            calculatedAt: new Date()
        };
    }

    /**
     * Calculate size-based risk score (0-100)
     * Larger asteroids pose greater impact threat
     */
    calculateSizeScore(asteroid) {
        const diameterKm = this.getAverageDiameter(asteroid);

        if (!diameterKm) return 0;

        // Size scoring based on Torino scale concepts
        if (diameterKm >= 1) return 100;           // > 1 km - catastrophic
        if (diameterKm >= 0.5) return 80;          // 500m-1km - very dangerous
        if (diameterKm >= 0.2) return 60;         // 200-500m - dangerous
        if (diameterKm >= 0.1) return 45;         // 100-200m - concerning
        if (diameterKm >= 0.05) return 30;         // 50-100m - notable
        if (diameterKm >= 0.02) return 20;         // 20-50m - small
        if (diameterKm >= 0.01) return 10;         // 10-20m - tiny
        return 5;                                   // < 10m - minimal
    }

    /**
     * Calculate velocity-based risk score (0-100)
     * Higher velocity = greater kinetic energy
     */
    calculateVelocityScore(asteroid) {
        const velocityKmS = parseFloat(asteroid.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second) || 0;

        if (velocityKmS >= 70) return 100;         // Extremely fast
        if (velocityKmS >= 50) return 80;         // Very fast
        if (velocityKmS >= 35) return 60;          // Fast
        if (velocityKmS >= 25) return 45;         // Moderate-fast
        if (velocityKmS >= 15) return 30;          // Moderate
        if (velocityKmS >= 10) return 20;         // Slow-moderate
        if (velocityKmS >= 5) return 10;          // Slow
        return 5;                                   // Very slow
    }

    /**
     * Calculate miss distance risk score (0-100)
     * Closer approach = higher risk
     */
    calculateMissDistanceScore(asteroid) {
        const missDistanceKm = parseFloat(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers) || Infinity;

        if (missDistanceKm < 100000) return 100;      // < 100,000 km - extremely close!
        if (missDistanceKm < 500000) return 85;       // < 500,000 km - very close
        if (missDistanceKm < 1000000) return 70;      // < 1M km - close lunar distance
        if (missDistanceKm < 5000000) return 55;     // < 5M km - nearby
        if (missDistanceKm < 10000000) return 40;    // < 10M km - approaching
        if (missDistanceKm < 50000000) return 25;    // < 50M km - moderate distance
        if (missDistanceKm < 100000000) return 15;    // < 100M km - distant
        return 5;                                      // > 100M km - far
    }

    /**
     * Calculate hazard flag score (0 or 50 bonus)
     */
    calculateHazardFlagScore(asteroid) {
        // NASA already classifies potentially hazardous asteroids
        return asteroid.is_potentially_hazardous_asteroid ? 50 : 0;
    }

    /**
     * Get average diameter in kilometers
     */
    getAverageDiameter(asteroid) {
        const estDia = asteroid.estimated_diameter?.kilometers;
        if (estDia) {
            return (estDia.estimated_diameter_min + estDia.estimated_diameter_max) / 2;
        }
        return null;
    }

    /**
     * Determine risk category based on score and hazard flag
     */
    determineCategory(score, isHazardous) {
        // Hazardous asteroids get bumped to at least medium
        if (isHazardous && score < 30) {
            return 'medium';
        }

        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    /**
     * Get risk category display properties
     */
    getCategoryDisplay(category) {
        const displays = {
            low: {
                label: 'Low Risk',
                color: '#22c55e',
                bgColor: '#dcfce7',
                icon: '🟢',
                description: 'Routine monitoring only'
            },
            medium: {
                label: 'Medium Risk',
                color: '#f59e0b',
                bgColor: '#fef3c7',
                icon: '🟡',
                description: 'Regular monitoring recommended'
            },
            high: {
                label: 'High Risk',
                color: '#ef4444',
                bgColor: '#fee2e2',
                icon: '🔴',
                description: 'Close attention required'
            },
            critical: {
                label: 'CRITICAL',
                color: '#7c3aed',
                bgColor: '#ede9fe',
                icon: '⚠️',
                description: 'Immediate attention needed'
            }
        };
        return displays[category] || displays.low;
    }

    /**
     * Generate risk assessment summary
     */
    generateSummary(asteroid, riskAssessment) {
        const factors = riskAssessment.factors;
        const primaryRisk = this.getPrimaryRiskFactor(factors);

        return {
            overallRisk: riskAssessment.category,
            score: riskAssessment.score,
            primaryRiskFactor: primaryRisk,
            sizeAssessment: this.getSizeAssessment(factors.sizeScore),
            velocityAssessment: this.getVelocityAssessment(factors.velocityScore),
            distanceAssessment: this.getDistanceAssessment(factors.missDistanceScore),
            isPotentiallyHazardous: asteroid.is_potentially_hazardous_asteroid,
            recommendations: this.getRecommendations(riskAssessment, asteroid)
        };
    }

    /**
     * Get primary risk factor
     */
    getPrimaryRiskFactor(factors) {
        const entries = Object.entries(factors);
        const sorted = entries.sort((a, b) => b[1] - a[1]);
        return {
            factor: sorted[0][0].replace('Score', ''),
            score: sorted[0][1]
        };
    }

    /**
     * Get size assessment description
     */
    getSizeAssessment(score) {
        if (score >= 80) return 'Large (500m+) - Potentially catastrophic if impact';
        if (score >= 60) return 'Medium-Large (200-500m) - Significant damage potential';
        if (score >= 40) return 'Medium (100-200m) - Regional impact possible';
        if (score >= 20) return 'Small (20-100m) - Local effects only';
        return 'Very Small (<20m) - Likely to burn up in atmosphere';
    }

    /**
     * Get velocity assessment description
     */
    getVelocityAssessment(score) {
        if (score >= 80) return 'Very High Velocity - Maximum kinetic energy';
        if (score >= 60) return 'High Velocity - Significant impact energy';
        if (score >= 40) return 'Moderate Velocity - Standard approach speed';
        return 'Low Velocity - Slow approach';
    }

    /**
     * Get distance assessment description
     */
    getDistanceAssessment(score) {
        if (score >= 80) return 'Very Close Approach - Within lunar distance';
        if (score >= 60) return 'Close Approach - Within 5M km';
        if (score >= 40) return 'Moderate Distance - 5-10M km';
        return 'Safe Distance - Well beyond Earth orbit';
    }

    /**
     * Get recommendations based on risk assessment
     */
    getRecommendations(riskAssessment, asteroid) {
        const recommendations = [];
        const category = riskAssessment.category;

        if (category === 'critical') {
            recommendations.push('⚠️ Immediate scientific attention required');
            recommendations.push('📡 Activate continuous tracking');
            recommendations.push('🌍 Notify relevant space agencies');
        }

        if (category === 'high' || riskAssessment.factors.hazardFlagScore > 0) {
            recommendations.push('🔭 Schedule follow-up observations');
            recommendations.push('📊 Refine orbital calculations');
        }

        if (riskAssessment.factors.sizeScore > 60) {
            recommendations.push('📏 Diameter > 200m - Impact would cause regional damage');
        }

        if (riskAssessment.factors.missDistanceScore > 60) {
            recommendations.push('📍 Close approach - Monitor for trajectory changes');
        }

        if (riskAssessment.factors.velocityScore > 70) {
            recommendations.push('💨 High velocity - Enhanced impact energy');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Routine monitoring only');
        }

        return recommendations;
    }
}

// Export singleton instance
module.exports = new RiskAnalysisEngine();
