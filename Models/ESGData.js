import mongoose from 'mongoose';

const esgDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Company Information
    companyInfo: {
        companyName: { type: String },
        registrationNumber: { type: String },
        establishmentYear: { type: String },
        companyAddress: { type: String },
        businessType: { type: String },
        registrationCertificate: { type: String },
        rolesDefinedClearly: { type: String },
        organizationRoles: [
            {
                role: { type: String },
                responsibility: { type: String }
            }
        ],
        certificates: [
            {
                type: { type: String },
                level: { type: String },
                validity: { type: String }
            }
        ],
        value: String,
        points: { type: Number, default: 0 },
        remarks: String,
        lastUpdated: { type: Date, default: Date.now }
    },

    // Environment Data
    environment: {
        renewableEnergy: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        waterConsumption: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        rainwaterHarvesting: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        emissionControl: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        resourceConservation: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        }
    },
    // Social Data
    social: {
        swachhWorkplace: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        occupationalSafety: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        hrManagement: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        csrResponsibility: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        }
    },
    // Governance Data
    governance: {
        deliveryPerformance: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        qualityManagement: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        processControl: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        materialManagement: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        maintenanceCalibration: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        technologyUpgradation: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        }
    },
    // Overall ESG Score
    overallScore: {
        environment: { type: Number, default: 0 },
        social: { type: Number, default: 0 },
        governance: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    // Status and Review
    status: {
        type: String,
        enum: ['draft', 'submitted', 'reviewed', 'approved', 'rejected'],
        default: 'draft'
    },
    reviewComments: String,
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Calculate overall scores before saving
esgDataSchema.pre('save', function (next) {
    // Calculate Environment Score
    const envScores = Object.values(this.environment).map(item => item.points || 0);
    this.overallScore.environment = envScores.reduce((a, b) => a + b, 0) / envScores.length;

    // Calculate Social Score
    const socialScores = Object.values(this.social).map(item => item.points || 0);
    this.overallScore.social = socialScores.reduce((a, b) => a + b, 0) / socialScores.length;

    // Calculate Governance Score
    const govScores = Object.values(this.governance).map(item => item.points || 0);
    this.overallScore.governance = govScores.reduce((a, b) => a + b, 0) / govScores.length;

    // Calculate Total Score
    this.overallScore.total = (this.overallScore.environment + this.overallScore.social + this.overallScore.governance) / 3;

    next();
});

export default mongoose.model('ESGData', esgDataSchema); 