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
            value: String,  // kWh/month or percentage
            certificate: String,  // renewable-energy certificates
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        waterConsumption: {
            baseline: String,  // Baseline water consumption
            targets: String,   // Water reduction targets
            progress: String,  // Progress towards targets
            certificate: String,  // water-use policy or monitoring data
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        rainwaterHarvesting: {
            volume: String,  // Annual volume in kL/yr
            rechargeCapacity: String,  // Recharge capacity
            infrastructure: String,  // Infrastructure details
            maintenance: String,  // Maintenance process
            certificate: String,  // rainwater-harvesting design docs, monitoring reports
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        emissionControl: {
            chemicalManagement: String,  // Chemical management and disposal methods
            chemicalList: [String],  // List of chemicals
            disposalMethods: [String],  // Disposal methods
            eiaReports: String,  // Environmental Impact Assessment reports
            lcaReports: String,  // Life Cycle Assessment reports
            scopeEmissions: {
                scope1: { type: String, default: '' },  // Direct emissions
                scope2: { type: String, default: '' },  // Indirect emissions from purchased energy
                scope3: { type: String, default: '' }   // Other indirect emissions
            },
            certificate: String,  // chemical inventories, EIA/LCA reports, emissions data
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        resourceConservation: {
            wasteDiversion: String,  // Percentage of waste diverted
            packagingMeasures: String,  // Packaging impact measures
            certifications: [String],  // Environmental certifications
            certificate: String,  // waste-management report, packaging policy, certification documents
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        }
    },
    // Social Data
    social: {
        swachhWorkplace: {
            sopDetails: String,  // Cleaning and hygiene SOP details
            workplaceMaintenance: String,  // Workplace maintenance guidelines
            certificate: String,  // cleaning SOP documents, audit reports, training records
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        occupationalSafety: {
            ltifr: String,  // Latest Lost-Time Injury Frequency Rate
            safetyTraining: {
                programs: [String],  // Safety training programs
                coverage: String,  // Employee coverage percentage
            },
            emergencyResponse: {
                plan: String,  // Emergency response plan
                drillFrequency: String,  // Drill frequency
            },
            riskAssessment: String,  // H&S risk assessment methods
            healthServices: {
                facilities: String,  // On-site health facilities
                checkupFrequency: String,  // Health check-up frequency
            },
            insurance: String,  // Work-related injury insurance
            certificate: String,  // safety training schedules, LTIFR report, emergency-drill records
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        hrManagement: {
            humanRightsPolicy: String,  // Human rights policy details
            supplierCode: String,  // Supplier code of conduct
            wagesBenefits: {
                fairWages: String,  // Fair wages implementation
                benefits: String,  // Benefits details
                wageAudits: String,  // Wage audit information
            },
            diversity: {
                leadershipPercentage: String,  // Women/underrepresented groups in leadership
                boardPercentage: String,  // Women/underrepresented groups on board
            },
            grievanceMechanism: {
                details: String,  // Grievance mechanism details
                casesRaised: Number,  // Number of cases raised
                resolutionOutcomes: String,  // Resolution outcomes
            },
            trainingDevelopment: {
                hoursPerEmployee: String,  // Training hours per employee
                keyPrograms: [String],  // Key training programs
            },
            certificate: String,  // policy documents, wage-audit summary, diversity dashboard, grievance log, training metrics
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        csrSocialResponsibilities: {
            communityInvestment: {
                initiatives: [String],  // Community investment initiatives
                localHiring: String,  // Local hiring initiatives
            },
            csrProjects: [{
                name: String,  // Project name
                description: String,  // Project description
                impact: String,  // Impact summary
                year: Number,  // Project year
            }],
            employeeOutreach: {
                programs: [String],  // Employee outreach programs
                participation: String,  // Participation details
                spend: String,  // Program spend
            },
            socialOutcomes: {
                measurement: String,  // How outcomes are measured
                reporting: String,  // How outcomes are reported
                feedback: String,  // Community feedback
            },
            certificate: String,  // project reports, impact assessments, media coverage
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        }
    },
    // Quality Data
    quality: {
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
    // Governance Data
    governance: {
        governanceStructure: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        policiesCompliance: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        reportingTargets: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        supplierDueDiligence: {
            value: String,
            certificate: String,
            points: { type: Number, default: 0 },
            remarks: String,
            lastUpdated: { type: Date, default: Date.now }
        },
        incidentsRemediation: {
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
        quality: { type: Number, default: 0 },
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

    // Calculate Quality Score
    const qualityScores = Object.values(this.quality).map(item => item.points || 0);
    this.overallScore.quality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    // Calculate Governance Score
    const governanceScores = Object.values(this.governance).map(item => item.points || 0);
    this.overallScore.governance = governanceScores.reduce((a, b) => a + b, 0) / governanceScores.length;

    // Calculate Total Score (now including governance)
    this.overallScore.total = (
        this.overallScore.environment +
        this.overallScore.social +
        this.overallScore.quality +
        this.overallScore.governance
    ) / 4;

    next();
});

export default mongoose.model('ESGData', esgDataSchema); 