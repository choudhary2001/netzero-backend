import ESGData from '../Models/ESGData.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import SupplierProfile from '../Models/supplierProfile.js';

// Storage configuration for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/certificates';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'), false);
    }
};

// Multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Handle certificate upload
export const uploadCertificate = async (req, res) => {
    try {
        // Single file upload using multer
        upload.single('file')(req, res, async function (err) {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File size is too large. Maximum size is 5MB.'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            // Get category and section from request
            const { category, section } = req.body;

            const filePath = req.file.path;

            // Return the file path
            res.status(200).json({
                success: true,
                data: {
                    filePath,
                    category,
                    section
                },
                message: 'Certificate uploaded successfully'
            });
        });
    } catch (error) {
        console.error('Error in uploadCertificate:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading certificate',
            error: error.message
        });
    }
};

// Create or update ESG data
export const createOrUpdateESGData = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;
        const companyId = req.user.companyId || userId;
        const { category, section, data } = req.body;

        // Required fields validation
        if (!category || !section || !data) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: category, section, and data are required'
            });
        }

        console.log('Creating/Updating ESG data with:', { userId, category, section });

        // Find existing ESG data
        let esgData = await ESGData.findOne({ userId, companyId });

        // Special handling for emissionControl section to ensure scopeEmissions is properly structured
        if (category === 'environment' && section === 'emissionControl') {
            const scopeEmissions = {
                scope1: data.scopeEmissions?.scope1 || '',
                scope2: data.scopeEmissions?.scope2 || '',
                scope3: data.scopeEmissions?.scope3 || ''
            };

            // Merge the scope emissions data with the rest of the data
            data.scopeEmissions = scopeEmissions;
        }

        if (!esgData) {
            // Create new ESG data if it doesn't exist
            console.log('Creating new ESG data record');
            esgData = new ESGData({
                userId,
                companyId,
                [category]: {
                    [section]: data
                }
            });
        } else {
            // Update existing ESG data
            console.log('Updating existing ESG data record');

            // Initialize category if it doesn't exist
            if (!esgData[category]) {
                esgData[category] = {};
            }

            // For emissionControl, ensure we preserve the scopeEmissions structure
            if (category === 'environment' && section === 'emissionControl') {
                const existingData = esgData[category][section] || {};
                esgData[category][section] = {
                    ...existingData,
                    ...data,
                    scopeEmissions: {
                        ...existingData.scopeEmissions,
                        ...data.scopeEmissions
                    },
                    lastUpdated: new Date()
                };
            } else {
                esgData[category][section] = {
                    ...esgData[category][section],
                    ...data,
                    lastUpdated: new Date()
                };
            }
        }

        await esgData.save();
        console.log('ESG data saved successfully');

        res.status(200).json({
            success: true,
            data: esgData,
            message: 'ESG data updated successfully'
        });
    } catch (error) {
        console.error('Error in createOrUpdateESGData:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating ESG data',
            error: error.message
        });
    }
};

// Get ESG data for a user
export const getESGData = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;

        // For companyId: if using a supplier's profile, we might not have a direct companyId in the token
        // For simplicity in this implementation, we'll use the userId as the companyId for now
        const companyId = req.user.companyId || userId;

        console.log('Fetching ESG data for user:', userId);

        const esgData = await ESGData.findOne({ userId, companyId });

        if (!esgData) {
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        }

        res.status(200).json({
            success: true,
            data: esgData
        });
    } catch (error) {
        console.error('Error in getESGData:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ESG data',
            error: error.message
        });
    }
};

// Submit ESG data for review
export const submitESGData = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;

        // For companyId: if using a supplier's profile, we might not have a direct companyId in the token
        // For simplicity in this implementation, we'll use the userId as the companyId for now
        const companyId = req.user.companyId || userId;

        const esgData = await ESGData.findOne({ userId, companyId });

        if (!esgData) {
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        }

        esgData.status = 'submitted';
        await esgData.save();

        res.status(200).json({
            success: true,
            message: 'ESG data submitted for review',
            data: esgData
        });
    } catch (error) {
        console.error('Error in submitESGData:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting ESG data',
            error: error.message
        });
    }
};

// Review ESG data (for admin/reviewer)
export const reviewESGData = async (req, res) => {
    try {
        const { esgDataId } = req.params;
        const { status, reviewComments } = req.body;

        const esgData = await ESGData.findById(esgDataId);

        if (!esgData) {
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        }

        esgData.status = status;
        esgData.reviewComments = reviewComments;
        await esgData.save();

        res.status(200).json({
            success: true,
            message: 'ESG data reviewed successfully',
            data: esgData
        });
    } catch (error) {
        console.error('Error in reviewESGData:', error);
        res.status(500).json({
            success: false,
            message: 'Error reviewing ESG data',
            error: error.message
        });
    }
};

// Get all ESG data (for admin)
export const getAllESGData = async (req, res) => {
    try {
        const esgData = await ESGData.find()
            .populate('userId', 'name email')
            .populate('companyId', 'name');

        res.status(200).json({
            success: true,
            data: esgData
        });
    } catch (error) {
        console.error('Error in getAllESGData:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all ESG data',
            error: error.message
        });
    }
};

// Update points for a specific section
export const updateSectionPoints = async (req, res) => {
    try {
        const { esgDataId, category, section, points, remarks } = req.body;

        const esgData = await ESGData.findById(esgDataId);

        if (!esgData) {
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        }

        // Validate category and section exist
        if (!esgData[category] || !esgData[category][section]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category or section'
            });
        }

        // Update the points
        esgData[category][section].points = points;
        esgData[category][section].remarks = remarks;
        esgData[category][section].lastUpdated = new Date();

        await esgData.save();

        res.status(200).json({
            success: true,
            data: esgData,
            message: 'Points updated successfully'
        });
    } catch (error) {
        console.error('Error in updateSectionPoints:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating points',
            error: error.message
        });
    }
};

// Simple test endpoint to verify API is working
export const testEsgApi = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'ESG API is working',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in testEsgApi:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing ESG API',
            error: error.message
        });
    }
};

// Get company info for a user
export const getCompanyInfo = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;

        // For companyId: if using a supplier's profile, we might not have a direct companyId in the token
        // For simplicity in this implementation, we'll use the userId as the companyId for now
        const companyId = req.user.companyId || userId;

        console.log('Fetching company info data for user:', userId);

        const esgData = await ESGData.findOne({ userId, companyId });

        if (!esgData || !esgData.companyInfo) {
            return res.status(404).json({
                success: false,
                message: 'Company information not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                companyInfo: esgData.companyInfo
            }
        });
    } catch (error) {
        console.error('Error in getCompanyInfo:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company information',
            error: error.message
        });
    }
};

// Update company info
export const updateCompanyInfo = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;
        const companyId = req.user.companyId || userId;

        const { data } = req.body;

        // Required fields validation
        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: data'
            });
        }

        console.log('Updating company info with:', { userId });

        // Find existing ESG data
        let esgData = await ESGData.findOne({ userId, companyId });

        if (!esgData) {
            // Create new ESG data if it doesn't exist
            console.log('Creating new ESG data record with company info');
            esgData = new ESGData({
                userId,
                companyId,
                companyInfo: {
                    ...data,
                    lastUpdated: new Date()
                }
            });
        } else {
            // Update existing ESG data
            console.log('Updating existing company info');
            esgData.companyInfo = {
                ...data,
                lastUpdated: new Date()
            };
        }

        await esgData.save();
        console.log('Company info saved successfully');

        res.status(200).json({
            success: true,
            data: {
                companyInfo: esgData.companyInfo
            },
            message: 'Company information updated successfully'
        });
    } catch (error) {
        console.error('Error in updateCompanyInfo:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating company information',
            error: error.message
        });
    }
};

// Update company info
export const updateCompanyInfoRating = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;
        // const companyId = req.user.companyId || userId;
        console.log('req.body', req.body);
        const { esgDataId, rating, remarks } = req.body;

        // Required fields validation
        if (!rating || !remarks) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: rating or remarks'
            });
        }

        console.log('Updating company info rating with:', { userId, esgDataId });

        // Find existing ESG data
        let esgData = await ESGData.findById(esgDataId);
        console.log('ESG data:', esgData);
        if (!esgData) {
            // Create new ESG data if it doesn't exist
            console.log('Creating new ESG data record with company info rating');
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        } else {
            // Update existing ESG data
            console.log('Updating existing company info');
            esgData.companyInfo.points = rating;
            esgData.companyInfo.remarks = remarks;
            esgData.companyInfo.lastUpdated = new Date();

        }

        await esgData.save();
        console.log('Company info rating saved successfully');

        console.log('Company info rating:', esgData.companyInfo);

        res.status(200).json({
            success: true,
            data: {
                companyInfo: esgData.companyInfo
            },
            message: 'Company information updated successfully'
        });
    } catch (error) {
        console.error('Error in updateCompanyInfo:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating company information',
            error: error.message
        });
    }
};


// Helper function to calculate company info completion percentage
const calculateCompanyCompletion = (companyInfo) => {
    if (!companyInfo) return 0;

    const fields = [
        'companyName',
        'registrationNumber',
        'establishmentYear',
        'companyAddress',
        'businessType',
        'registrationCertificate'
    ];

    const completedFields = fields.filter(field =>
        companyInfo[field] && companyInfo[field] !== ''
    ).length;

    // Calculate completion percentage
    return Math.round((completedFields / fields.length) * 100);
};

// Helper function to calculate environmental completion percentage
const calculateEnvironmentalCompletion = (environment) => {
    if (!environment) return 0;

    const sections = [
        'renewableEnergy',
        'waterConsumption',
        'rainwaterHarvesting',
        'emissionControl',
        'resourceConservation'
    ];

    let completedFields = 0;
    let totalFields = 0;

    sections.forEach(section => {
        if (environment[section]) {
            switch (section) {
                case 'renewableEnergy':
                    totalFields += 2; // value and certificate
                    if (environment[section].value && environment[section].value !== '') completedFields++;
                    if (environment[section].certificate && environment[section].certificate !== '') completedFields++;
                    break;

                case 'waterConsumption':
                    totalFields += 4; // baseline, targets, progress, certificate
                    if (environment[section].baseline && environment[section].baseline !== '') completedFields++;
                    if (environment[section].targets && environment[section].targets !== '') completedFields++;
                    if (environment[section].progress && environment[section].progress !== '') completedFields++;
                    if (environment[section].certificate && environment[section].certificate !== '') completedFields++;
                    break;

                case 'rainwaterHarvesting':
                    totalFields += 5; // volume, rechargeCapacity, infrastructure, maintenance, certificate
                    if (environment[section].volume && environment[section].volume !== '') completedFields++;
                    if (environment[section].rechargeCapacity && environment[section].rechargeCapacity !== '') completedFields++;
                    if (environment[section].infrastructure && environment[section].infrastructure !== '') completedFields++;
                    if (environment[section].maintenance && environment[section].maintenance !== '') completedFields++;
                    if (environment[section].certificate && environment[section].certificate !== '') completedFields++;
                    break;

                case 'emissionControl':
                    totalFields += 9; // chemicalManagement, chemicalList, disposalMethods, eiaReports, lcaReports, scope1, scope2, scope3, certificate
                    if (environment[section].chemicalManagement && environment[section].chemicalManagement !== '') completedFields++;
                    if (Array.isArray(environment[section].chemicalList) && environment[section].chemicalList.length > 0) completedFields++;
                    if (Array.isArray(environment[section].disposalMethods) && environment[section].disposalMethods.length > 0) completedFields++;
                    if (environment[section].eiaReports && environment[section].eiaReports !== '') completedFields++;
                    if (environment[section].lcaReports && environment[section].lcaReports !== '') completedFields++;
                    // Add scope emissions fields
                    if (environment[section].scopeEmissions?.scope1 && environment[section].scopeEmissions.scope1 !== '') completedFields++;
                    if (environment[section].scopeEmissions?.scope2 && environment[section].scopeEmissions.scope2 !== '') completedFields++;
                    if (environment[section].scopeEmissions?.scope3 && environment[section].scopeEmissions.scope3 !== '') completedFields++;
                    if (environment[section].certificate && environment[section].certificate !== '') completedFields++;
                    break;

                case 'resourceConservation':
                    totalFields += 4; // wasteDiversion, packagingMeasures, certifications, certificate
                    if (environment[section].wasteDiversion && environment[section].wasteDiversion !== '') completedFields++;
                    if (environment[section].packagingMeasures && environment[section].packagingMeasures !== '') completedFields++;
                    if (Array.isArray(environment[section].certifications) && environment[section].certifications.length > 0) completedFields++;
                    if (environment[section].certificate && environment[section].certificate !== '') completedFields++;
                    break;
            }
        }
    });

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
};

// Helper function to calculate social completion percentage
const calculateSocialCompletion = (social) => {
    if (!social) return 0;

    const sections = [
        'swachhWorkplace',
        'occupationalSafety',
        'hrManagement',
        'csrSocialResponsibilities'
    ];

    let completedFields = 0;
    let totalFields = 0;

    sections.forEach(section => {
        if (social[section]) {
            switch (section) {
                case 'swachhWorkplace':
                    totalFields += 3; // sopDetails, workplaceMaintenance, certificate
                    if (social[section].sopDetails && social[section].sopDetails !== '') completedFields++;
                    if (social[section].workplaceMaintenance && social[section].workplaceMaintenance !== '') completedFields++;
                    if (social[section].certificate && social[section].certificate !== '') completedFields++;
                    break;

                case 'occupationalSafety':
                    totalFields += 8; // ltifr, safety programs, coverage, emergency plan, drill frequency, risk assessment, health facilities, checkup frequency, insurance, certificate
                    if (social[section].ltifr && social[section].ltifr !== '') completedFields++;
                    if (social[section].safetyTraining?.programs?.length > 0) completedFields++;
                    if (social[section].safetyTraining?.coverage && social[section].safetyTraining.coverage !== '') completedFields++;
                    if (social[section].emergencyResponse?.plan && social[section].emergencyResponse.plan !== '') completedFields++;
                    if (social[section].emergencyResponse?.drillFrequency && social[section].emergencyResponse.drillFrequency !== '') completedFields++;
                    if (social[section].riskAssessment && social[section].riskAssessment !== '') completedFields++;
                    if (social[section].healthServices?.facilities && social[section].healthServices.facilities !== '') completedFields++;
                    if (social[section].healthServices?.checkupFrequency && social[section].healthServices.checkupFrequency !== '') completedFields++;
                    if (social[section].insurance && social[section].insurance !== '') completedFields++;
                    if (social[section].certificate && social[section].certificate !== '') completedFields++;
                    break;

                case 'hrManagement':
                    totalFields += 10; // humanRightsPolicy, supplierCode, fairWages, benefits, wageAudits, leadership%, board%, grievance details, cases, resolution, hours, key programs, certificate
                    if (social[section].humanRightsPolicy && social[section].humanRightsPolicy !== '') completedFields++;
                    if (social[section].supplierCode && social[section].supplierCode !== '') completedFields++;
                    if (social[section].wagesBenefits?.fairWages && social[section].wagesBenefits.fairWages !== '') completedFields++;
                    if (social[section].wagesBenefits?.benefits && social[section].wagesBenefits.benefits !== '') completedFields++;
                    if (social[section].wagesBenefits?.wageAudits && social[section].wagesBenefits.wageAudits !== '') completedFields++;
                    if (social[section].diversity?.leadershipPercentage && social[section].diversity.leadershipPercentage !== '') completedFields++;
                    if (social[section].diversity?.boardPercentage && social[section].diversity.boardPercentage !== '') completedFields++;
                    if (social[section].grievanceMechanism?.details && social[section].grievanceMechanism.details !== '') completedFields++;
                    if (social[section].grievanceMechanism?.resolutionOutcomes && social[section].grievanceMechanism.resolutionOutcomes !== '') completedFields++;
                    if (social[section].trainingDevelopment?.hoursPerEmployee && social[section].trainingDevelopment.hoursPerEmployee !== '') completedFields++;
                    if (social[section].trainingDevelopment?.keyPrograms?.length > 0) completedFields++;
                    if (social[section].certificate && social[section].certificate !== '') completedFields++;
                    break;

                case 'csrSocialResponsibilities':
                    totalFields += 8; // community initiatives, localHiring, csrProjects, employee programs, participation, spend, outcomes measurement, reporting, feedback, certificate
                    if (social[section].communityInvestment?.initiatives?.length > 0) completedFields++;
                    if (social[section].communityInvestment?.localHiring && social[section].communityInvestment.localHiring !== '') completedFields++;
                    if (social[section].csrProjects?.length > 0) completedFields++;
                    if (social[section].employeeOutreach?.programs?.length > 0) completedFields++;
                    if (social[section].employeeOutreach?.participation && social[section].employeeOutreach.participation !== '') completedFields++;
                    if (social[section].employeeOutreach?.spend && social[section].employeeOutreach.spend !== '') completedFields++;
                    if (social[section].socialOutcomes?.measurement && social[section].socialOutcomes.measurement !== '') completedFields++;
                    if (social[section].socialOutcomes?.reporting && social[section].socialOutcomes.reporting !== '') completedFields++;
                    if (social[section].socialOutcomes?.feedback && social[section].socialOutcomes.feedback !== '') completedFields++;
                    if (social[section].certificate && social[section].certificate !== '') completedFields++;
                    break;
            }
        }
    });

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
};

// Helper function to calculate quality completion percentage
const calculateQualityCompletion = (quality) => {
    console.log('quality', quality);
    if (!quality) return 0;

    const sections = [
        'deliveryPerformance',
        'qualityManagement',
        'processControl',
        'materialManagement',
        'maintenanceCalibration',
        'technologyUpgradation'
    ];

    let completedSections = 0;
    let totalFields = 0;

    sections.forEach(section => {
        if (quality[section]) {
            totalFields += 2; // value and certificate fields
            if (quality[section].value && quality[section].value !== '') {
                completedSections += 1;
            }
            if (quality[section].certificate && quality[section].certificate !== '') {
                completedSections += 1;
            }
        }
    });

    return totalFields > 0 ? Math.round((completedSections / totalFields) * 100) : 0;
};

// Helper function to calculate governance completion percentage
const calculateGovernanceCompletion = (governance) => {
    if (!governance) return 0;

    const sections = [
        'governanceStructure',
        'policiesCompliance',
        'reportingTargets',
        'supplierDueDiligence',
        'incidentsRemediation'
    ];

    let completedSections = 0;
    let totalFields = 0;

    sections.forEach(section => {
        if (governance[section]) {
            totalFields += 2; // value and certificate fields
            if (governance[section].value && governance[section].value !== '') {
                completedSections += 1;
            }
            if (governance[section].certificate && governance[section].certificate !== '') {
                completedSections += 1;
            }
        }
    });

    return totalFields > 0 ? Math.round((completedSections / totalFields) * 100) : 0;
};

// Helper function to get recent updates
const getRecentUpdates = (esgData) => {
    const updates = [];
    const now = new Date();

    // Check for company info updates
    if (esgData.companyInfo && esgData.companyInfo.lastUpdated) {
        updates.push({
            id: 'company-1',
            title: 'Company information updated',
            date: formatTimeAgo(esgData.companyInfo.lastUpdated, now),
            status: 'Completed',
            type: 'company'
        });
    }

    // Check for environmental updates
    if (esgData.environment) {
        Object.entries(esgData.environment).forEach(([key, value]) => {
            if (value && value.lastUpdated) {
                updates.push({
                    id: `env-${key}`,
                    title: `Environmental ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`,
                    date: formatTimeAgo(value.lastUpdated, now),
                    status: value.points > 0 ? 'Reviewed' : 'Completed',
                    type: 'environment'
                });
            }
        });
    }

    // Check for social updates
    if (esgData.social) {
        Object.entries(esgData.social).forEach(([key, value]) => {
            if (value && value.lastUpdated) {
                updates.push({
                    id: `social-${key}`,
                    title: `Social ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`,
                    date: formatTimeAgo(value.lastUpdated, now),
                    status: value.points > 0 ? 'Reviewed' : 'Completed',
                    type: 'social'
                });
            }
        });
    }

    // Check for quality updates
    if (esgData.quality) {
        Object.entries(esgData.quality).forEach(([key, value]) => {
            if (value && value.lastUpdated) {
                updates.push({
                    id: `qual-${key}`,
                    title: `Quality ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`,
                    date: formatTimeAgo(value.lastUpdated, now),
                    status: value.points > 0 ? 'Reviewed' : 'Completed',
                    type: 'quality'
                });
            }
        });
    }

    // Check for governance updates
    if (esgData.governance) {
        Object.entries(esgData.governance).forEach(([key, value]) => {
            if (value && value.lastUpdated) {
                updates.push({
                    id: `gov-${key}`,
                    title: `Governance ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`,
                    date: formatTimeAgo(value.lastUpdated, now),
                    status: value.points > 0 ? 'Reviewed' : 'Completed',
                    type: 'governance'
                });
            }
        });
    }

    // Add overall status update
    if (esgData.status !== 'draft') {
        updates.push({
            id: 'status-1',
            title: `ESG data ${esgData.status}`,
            date: formatTimeAgo(esgData.lastUpdated, now),
            status: capitalizeFirstLetter(esgData.status),
            type: 'status'
        });
    }

    // Sort by date (most recent first) and limit to 5 updates
    return updates
        .sort((a, b) => {
            const dateA = parseDateFromTimeAgo(a.date);
            const dateB = parseDateFromTimeAgo(b.date);
            return dateB - dateA;
        })
        .slice(0, 5);
};

// Helper function to format time ago
const formatTimeAgo = (date, now) => {
    const diffMs = now - new Date(date);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
        const diffWeeks = Math.floor(diffDays / 7);
        return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    } else {
        const diffMonths = Math.floor(diffDays / 30);
        return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    }
};

// Helper function to parse a time ago string into a relative date
const parseDateFromTimeAgo = (timeAgoStr) => {
    const now = new Date();
    const regex = /(\d+)\s+(minute|hour|day|week|month)s?\s+ago/;
    const match = timeAgoStr.match(regex);

    if (!match) return now;

    const [, amount, unit] = match;
    const value = parseInt(amount, 10);

    switch (unit) {
        case 'minute':
            return new Date(now - value * 60 * 1000);
        case 'hour':
            return new Date(now - value * 60 * 60 * 1000);
        case 'day':
            return new Date(now - value * 24 * 60 * 60 * 1000);
        case 'week':
            return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now - value * 30 * 24 * 60 * 60 * 1000);
        default:
            return now;
    }
};

// Helper function to capitalize the first letter
const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// Get dashboard data for a user
export const getDashboardData = async (req, res) => {
    try {
        // Check if valid user data exists in the request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.',
            });
        }

        // Extract user ID from the JWT payload
        const userId = req.user.id;
        const companyId = req.user.companyId || userId;

        console.log('Fetching dashboard data for user:', userId);

        const esgData = await ESGData.findOne({ userId, companyId });

        if (!esgData) {
            return res.status(200).json({
                success: true,
                message: 'No ESG data found for this user',
                data: {
                    esgScores: {
                        environmental: 0,
                        social: 0,
                        quality: 0,
                        governance: 0,
                        overall: 0
                    },
                    formCompletion: {
                        company: 0,
                        environmental: 0,
                        social: 0,
                        quality: 0,
                        governance: 0
                    },
                    recentUpdates: [],
                    status: 'Not Started'
                }
            });
        }

        // Calculate form completion percentages
        const formCompletion = {
            company: calculateCompanyCompletion(esgData.companyInfo),
            environmental: calculateEnvironmentalCompletion(esgData.environment),
            social: calculateSocialCompletion(esgData.social),
            quality: calculateQualityCompletion(esgData.quality),
            governance: calculateGovernanceCompletion(esgData.governance)
        };

        // Get recent updates
        const recentUpdates = getRecentUpdates(esgData);

        res.status(200).json({
            success: true,
            data: {
                esgScores: {
                    environmental: Number((esgData.overallScore?.environment || 0).toFixed(2)),
                    social: Number((esgData.overallScore?.social || 0).toFixed(2)),
                    quality: Number((esgData.overallScore?.quality || 0).toFixed(2)),
                    governance: Number((esgData.overallScore?.governance || 0).toFixed(2)),
                    overall: Number((esgData.overallScore?.total || 0).toFixed(2))
                },
                formCompletion,
                recentUpdates,
                status: esgData.status || 'draft'
            }
        });
    } catch (error) {
        console.error('Error in getDashboardData:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
};

// Update ESG data
export const updateESGData = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { section, subsection, data } = req.body;

        // Validate section and subsection
        const validSections = ['environment', 'social', 'governance', 'quality'];
        const validEnvironmentSubsections = ['renewableEnergy', 'waterConsumption', 'rainwaterHarvesting', 'emissionControl', 'resourceConservation'];
        const validSocialSubsections = ['swachhWorkplace', 'occupationalSafety', 'hrManagement', 'csrSocialResponsibilities'];
        const validGovernanceSubsections = ['governanceStructure', 'policiesCompliance', 'reportingTargets', 'supplierDueDiligence', 'incidentsRemediation'];
        const validQualitySubsections = ['deliveryPerformance', 'qualityManagement', 'processControl', 'materialManagement', 'maintenanceCalibration', 'technologyUpgradation'];

        if (!validSections.includes(section)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid section'
            });
        }

        let validSubsections;
        switch (section) {
            case 'environment':
                validSubsections = validEnvironmentSubsections;
                break;
            case 'social':
                validSubsections = validSocialSubsections;
                break;
            case 'governance':
                validSubsections = validGovernanceSubsections;
                break;
            case 'quality':
                validSubsections = validQualitySubsections;
                break;
        }

        if (!validSubsections.includes(subsection)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subsection for the given section'
            });
        }

        // Calculate points based on section and subsection
        let points = calculatePoints(section, subsection, data);

        // Prepare update object
        const updateQuery = {};

        // Handle different data structures based on section and subsection
        switch (section) {
            case 'environment':
                switch (subsection) {
                    case 'waterConsumption':
                        updateQuery[`${section}.${subsection}`] = {
                            baseline: data.baseline || '',
                            targets: data.targets || '',
                            progress: data.progress || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    case 'rainwaterHarvesting':
                        updateQuery[`${section}.${subsection}`] = {
                            volume: data.volume || '',
                            rechargeCapacity: data.rechargeCapacity || '',
                            infrastructure: data.infrastructure || '',
                            maintenance: data.maintenance || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    case 'emissionControl':
                        updateQuery[`${section}.${subsection}`] = {
                            chemicalManagement: data.chemicalManagement || '',
                            chemicalList: Array.isArray(data.chemicalList) ? data.chemicalList : [],
                            disposalMethods: Array.isArray(data.disposalMethods) ? data.disposalMethods : [],
                            eiaReports: data.eiaReports || '',
                            lcaReports: data.lcaReports || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    case 'resourceConservation':
                        updateQuery[`${section}.${subsection}`] = {
                            wasteDiversion: data.wasteDiversion || '',
                            packagingMeasures: data.packagingMeasures || '',
                            certifications: Array.isArray(data.certifications) ? data.certifications : [],
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    case 'renewableEnergy':
                        updateQuery[`${section}.${subsection}`] = {
                            value: data.value || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    default:
                        updateQuery[`${section}.${subsection}`] = {
                            value: data.value || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                }
                break;

            case 'social':
                switch (subsection) {
                    case 'occupationalSafety':
                        updateQuery[`${section}.${subsection}`] = {
                            ltifr: data.ltifr || '',
                            safetyTraining: {
                                programs: data.safetyTraining?.programs || [],
                                coverage: data.safetyTraining?.coverage || ''
                            },
                            emergencyResponse: {
                                plan: data.emergencyResponse?.plan || '',
                                drillFrequency: data.emergencyResponse?.drillFrequency || ''
                            },
                            riskAssessment: data.riskAssessment || '',
                            healthServices: {
                                facilities: data.healthServices?.facilities || '',
                                checkupFrequency: data.healthServices?.checkupFrequency || ''
                            },
                            insurance: data.insurance || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    case 'hrManagement':
                        updateQuery[`${section}.${subsection}`] = {
                            humanRightsPolicy: data.humanRightsPolicy || '',
                            supplierCode: data.supplierCode || '',
                            wagesBenefits: {
                                fairWages: data.wagesBenefits?.fairWages || '',
                                benefits: data.wagesBenefits?.benefits || '',
                                wageAudits: data.wagesBenefits?.wageAudits || ''
                            },
                            diversity: {
                                leadershipPercentage: data.diversity?.leadershipPercentage || '',
                                boardPercentage: data.diversity?.boardPercentage || ''
                            },
                            grievanceMechanism: {
                                details: data.grievanceMechanism?.details || '',
                                casesRaised: data.grievanceMechanism?.casesRaised || 0,
                                resolutionOutcomes: data.grievanceMechanism?.resolutionOutcomes || ''
                            },
                            trainingDevelopment: {
                                hoursPerEmployee: data.trainingDevelopment?.hoursPerEmployee || '',
                                keyPrograms: data.trainingDevelopment?.keyPrograms || []
                            },
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    case 'csrSocialResponsibilities':
                        // Ensure csrProjects is properly formatted
                        const csrProjects = Array.isArray(data.csrProjects)
                            ? data.csrProjects.map(project => ({
                                name: project.name || '',
                                description: project.description || '',
                                impact: project.impact || '',
                                year: project.year || ''
                            }))
                            : [];

                        updateQuery[`${section}.${subsection}`] = {
                            communityInvestment: {
                                initiatives: Array.isArray(data.communityInvestment?.initiatives)
                                    ? data.communityInvestment.initiatives
                                    : [],
                                localHiring: data.communityInvestment?.localHiring || ''
                            },
                            csrProjects: csrProjects,
                            employeeOutreach: {
                                programs: Array.isArray(data.employeeOutreach?.programs)
                                    ? data.employeeOutreach.programs
                                    : [],
                                participation: data.employeeOutreach?.participation || '',
                                spend: data.employeeOutreach?.spend || ''
                            },
                            socialOutcomes: {
                                measurement: data.socialOutcomes?.measurement || '',
                                reporting: data.socialOutcomes?.reporting || '',
                                feedback: data.socialOutcomes?.feedback || ''
                            },
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                        break;
                    default:
                        updateQuery[`${section}.${subsection}`] = {
                            value: data.value || '',
                            certificate: data.certificate || '',
                            points,
                            remarks: data.remarks || '',
                            lastUpdated: new Date()
                        };
                }
                break;

            default:
                updateQuery[`${section}.${subsection}`] = {
                    value: data.value || '',
                    certificate: data.certificate || '',
                    points,
                    remarks: data.remarks || '',
                    lastUpdated: new Date()
                };
        }

        const updatedData = await ESGData.findOneAndUpdate(
            { supplierId },
            { $set: updateQuery },
            { new: true, upsert: true }
        );

        // Update supplier profile form submission status
        await SupplierProfile.findOneAndUpdate(
            { supplierId },
            { [`formSubmissions.${section}.submitted`]: true }
        );

        res.status(200).json({
            success: true,
            message: 'ESG data updated successfully',
            data: updatedData
        });
    } catch (error) {
        console.error('Error updating ESG data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating ESG data'
        });
    }
};

// Helper function to calculate points
const calculatePoints = (section, subsection, data) => {
    let points = 0;

    // Basic points for providing information
    if (data) {
        points = 10;

        // Additional points for providing certificates
        if (data.certificate) {
            points += 5;
        }

        // Section-specific scoring logic
        switch (section) {
            case 'environment':
                switch (subsection) {
                    case 'renewableEnergy':
                        const renewablePercentage = parseFloat(data.value);
                        if (!isNaN(renewablePercentage)) {
                            points += Math.min(renewablePercentage / 10, 15);
                        }
                        break;
                    case 'waterConsumption':
                        if (data.targets && data.progress) {
                            points += 10;
                        }
                        break;
                    case 'rainwaterHarvesting':
                        if (data.volume && data.infrastructure) {
                            points += 10;
                        }
                        break;
                    case 'emissionControl':
                        if (data.chemicalManagement && data.disposalMethods?.length > 0) {
                            points += 10;
                        }
                        break;
                    case 'resourceConservation':
                        if (data.wasteDiversion && data.certifications?.length > 0) {
                            points += 10;
                        }
                        break;
                }
                break;

            case 'social':
                switch (subsection) {
                    case 'occupationalSafety':
                        if (data.ltifr && data.safetyTraining?.programs?.length > 0) {
                            points += 10;
                        }
                        break;
                    case 'hrManagement':
                        if (data.humanRightsPolicy && data.diversity?.leadershipPercentage) {
                            points += 10;
                        }
                        break;
                    case 'csrSocialResponsibilities':
                        if (data.csrProjects?.length > 0 && data.communityInvestment?.initiatives?.length > 0) {
                            points += 10;
                        }
                        break;
                }
                break;
        }
    }

    return points;
}; 