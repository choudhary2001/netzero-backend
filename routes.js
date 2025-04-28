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
    updateProfile
} from './Controllers/user.js';
import { verifyToken, isAdmin, isCompany, isSupplier } from './middlewares/auth.js';
import { fetchRole } from './middlewares/fetchRole.js';
import {
    getAllSuppliers,
    getSupplierById,
    updateEsgScores,
    updateFormSubmission
} from './Controllers/supplier.js';

import express from 'express';
const router = express.Router();

// User routes
router.get('/users', async (req, res) => {
    res.send('users route');
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
router.patch('/users/profile/', verifyToken, updateProfile);

// Supplier routes
router.get('/suppliers/', verifyToken, isAdmin, getAllSuppliers);
router.get('/suppliers/:id', verifyToken, getSupplierById);
router.patch('/suppliers/:id/esg-scores', verifyToken, updateEsgScores);
router.patch('/suppliers/:id/form-submission', verifyToken, updateFormSubmission);

// Role fetching
router.get("/auth/fetch-role", verifyToken, fetchRole);

export default router;