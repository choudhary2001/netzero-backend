import {
    login,
    register,
    verifyOTP,
    logout,
    refreshToken,
    blacklistToken,
    getCurrentUser,
    requestPasswordReset,
    verifyPasswordResetOTP,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword
} from './Controllers/user.js';
import User from './Models/user.js';
import SupplierProfile from './Models/SupplierProfile.js';
import { verifyToken, isAdmin, isCompany, isSupplier } from './middlewares/auth.js';
import { fetchRole } from './middlewares/fetchRole.js';
import {
    getAllSuppliers,
    getSupplierById,
    updateEsgScores,
    updateFormSubmission
} from './Controllers/supplier.js';
import {
    createOrUpdateESGData,
    getESGData,
    submitESGData,
    reviewESGData,
    getAllESGData,
    uploadCertificate,
    updateSectionPoints,
    testEsgApi,
    getCompanyInfo,
    updateCompanyInfo,
    getDashboardData,
    updateCompanyInfoRating
} from './Controllers/esgController.js';

// Import admin controller
import {
    getDashboardSummary,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getAllESGSubmissions,
    getMessageAnalytics
} from './Controllers/adminController.js';

// Import chat controller
import {
    getConversations,
    getConversation,
    createConversation,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    getUnreadCount
} from './Controllers/chatController.js';

import express from 'express';
const router = express.Router();

// User routes
router.get('/users', async (req, res) => {
    const users = await User.find({ role: req.query.role }).select('-password');
    res.json(users);
});

// Authentication routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/otp-verification', verifyOTP);
router.post('/auth/logout', verifyToken, logout);

// JWT Token routes
router.post('/token/', login);
router.post('/token/refresh/', refreshToken);
router.post('/token/blacklist/', blacklistToken);
router.get('/users/me/', verifyToken, getCurrentUser);

// Password reset routes
router.post('/password-reset/request/', requestPasswordReset);
router.post('/password-reset/verify-otp/', verifyPasswordResetOTP);
router.post('/password-reset/reset/', resetPassword);

// Profile routes
router.get('/users/profile/', verifyToken, getProfile);
router.post('/users/profile/', verifyToken, updateProfile);
router.patch('/users/profile/', verifyToken, updateProfile);
router.post('/users/change-password/', verifyToken, changePassword);

// Supplier routes
router.get('/suppliers/', verifyToken, isAdmin, getAllSuppliers);
router.get('/suppliers/:id', verifyToken, getSupplierById);
router.patch('/suppliers/:id/esg-scores', verifyToken, updateEsgScores);
router.patch('/suppliers/:id/form-submission', verifyToken, updateFormSubmission);

// Role fetching
router.get("/auth/fetch-role", verifyToken, fetchRole);

// ESG Routes
router.get('/esg/test', testEsgApi); // Test endpoint without auth
router.post('/esg/update', verifyToken, createOrUpdateESGData);
router.get('/esg/data', verifyToken, getESGData);
router.post('/esg/submit', verifyToken, submitESGData);
router.post('/esg/review/:esgDataId', verifyToken, reviewESGData);
router.get('/esg/all', verifyToken, getAllESGData);
router.post('/esg/upload-certificate', verifyToken, uploadCertificate);
router.post('/esg/update-points', verifyToken, updateSectionPoints);

// Company Info Routes
router.get('/company-info', verifyToken, getCompanyInfo);
router.post('/company-info', verifyToken, updateCompanyInfo);
router.post('/company-info/rating', verifyToken, updateCompanyInfoRating);

// Dashboard Route
router.get('/dashboard', verifyToken, getDashboardData);

// Admin Routes
router.get('/admin/dashboard', verifyToken, isAdmin, getDashboardSummary);
router.get('/admin/users', verifyToken, isAdmin, getAllUsers);
router.post('/admin/users', verifyToken, isAdmin, createUser);
router.put('/admin/users/:id', verifyToken, isAdmin, updateUser);
router.delete('/admin/users/:id', verifyToken, isAdmin, deleteUser);
router.get('/admin/esg-submissions', verifyToken, isAdmin, getAllESGSubmissions);
router.get('/admin/message-analytics', verifyToken, isAdmin, getMessageAnalytics);

// Chat Routes
router.get('/chat/conversations', verifyToken, getConversations);
router.get('/chat/conversations/:conversationId', verifyToken, getConversation);
router.post('/chat/conversations', verifyToken, createConversation);
router.get('/chat/conversations/:conversationId/messages', verifyToken, getMessages);
router.post('/chat/conversations/:conversationId/messages', verifyToken, sendMessage);
router.put('/chat/conversations/:conversationId/read', verifyToken, markMessagesAsRead);
router.get('/chat/unread', verifyToken, getUnreadCount);

export default router;