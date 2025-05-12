import ESGData from '../Models/ESGData.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

        // For companyId: if using a supplier's profile, we might not have a direct companyId in the token
        // For simplicity in this implementation, we'll use the userId as the companyId for now
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

            esgData[category][section] = {
                ...esgData[category][section],
                ...data,
                lastUpdated: new Date()
            };
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

    let completedSections = 0;
    let totalFields = 0;

    sections.forEach(section => {
        if (environment[section]) {
            totalFields += 2; // value and certificate fields
            if (environment[section].value && environment[section].value !== '') {
                completedSections += 1;
            }
            if (environment[section].certificate && environment[section].certificate !== '') {
                completedSections += 1;
            }
        }
    });

    return totalFields > 0 ? Math.round((completedSections / totalFields) * 100) : 0;
};

// Helper function to calculate social completion percentage
const calculateSocialCompletion = (social) => {
    if (!social) return 0;

    const sections = [
        'swachhWorkplace',
        'occupationalSafety',
        'hrManagement',
        'csrResponsibility'
    ];

    let completedSections = 0;
    let totalFields = 0;

    sections.forEach(section => {
        if (social[section]) {
            totalFields += 2; // value and certificate fields
            if (social[section].value && social[section].value !== '') {
                completedSections += 1;
            }
            if (social[section].certificate && social[section].certificate !== '') {
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
                        governance: 0,
                        overall: 0
                    },
                    formCompletion: {
                        company: 0,
                        environmental: 0,
                        social: 0,
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
            governance: calculateGovernanceCompletion(esgData.governance)
        };

        // Get recent updates based on lastUpdated timestamps
        const recentUpdates = getRecentUpdates(esgData);

        res.status(200).json({
            success: true,
            data: {
                esgScores: {
                    environmental: Number((esgData.overallScore?.environment || 0).toFixed(2)),
                    social: Number((esgData.overallScore?.social || 0).toFixed(2)),
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