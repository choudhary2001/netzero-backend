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
        const { esgDataId, category, section, points } = req.body;

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