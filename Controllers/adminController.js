import User from '../Models/user.js';
import ESGData from '../Models/ESGData.js';
import SupplierProfile from '../Models/SupplierProfile.js';
import Chat from '../Models/Chat.js';
import mongoose from 'mongoose';

// Get dashboard summary data
export const getDashboardSummary = async (req, res) => {
    try {
        // Get user counts by role
        const totalUsers = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        const supplierCount = await User.countDocuments({ role: 'supplier' });
        const companyCount = await User.countDocuments({ role: 'company' });

        // Get pending ESG submissions (status = 'submitted')
        const pendingApprovals = await ESGData.countDocuments({ status: 'submitted' });

        // Get recent submissions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSubmissions = await ESGData.countDocuments({
            status: 'submitted',
            lastUpdated: { $gte: thirtyDaysAgo }
        });

        // Get submission trend (last 6 months)
        const submissionTrend = await getSubmissionTrend();

        // Get category distribution
        const categoryDistribution = await getCategoryDistribution();

        // Get recent activities
        const recentActivities = await getRecentActivities();

        res.status(200).json({
            success: true,
            data: {
                userCounts: {
                    total: totalUsers,
                    admin: adminCount,
                    supplier: supplierCount,
                    company: companyCount
                },
                pendingApprovals,
                recentSubmissions,
                submissionTrend,
                categoryDistribution,
                recentActivities
            }
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};

// Get submission trend for the last 6 months
const getSubmissionTrend = async () => {
    const months = [];
    const now = new Date();

    // Generate last 6 months (including current)
    for (let i = 5; i >= 0; i--) {
        const month = new Date(now);
        month.setMonth(now.getMonth() - i);
        const monthName = month.toLocaleString('default', { month: 'short' });
        months.push({
            name: monthName,
            startDate: new Date(month.getFullYear(), month.getMonth(), 1),
            endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0)
        });
    }

    // Get submission counts for each month
    const submissionsByMonth = await Promise.all(
        months.map(async (month) => {
            const count = await ESGData.countDocuments({
                lastUpdated: {
                    $gte: month.startDate,
                    $lte: month.endDate
                }
            });

            return {
                name: month.name,
                submissions: count
            };
        })
    );

    return submissionsByMonth;
};

// Get category distribution
const getCategoryDistribution = async () => {
    // Define "complete" as having non-null values in a key field from each section
    const environment = await ESGData.countDocuments({
        'environment.renewableEnergy.value': { $ne: null }
    });

    const social = await ESGData.countDocuments({
        'social.swachhWorkplace.value': { $ne: null }
    });

    const quality = await ESGData.countDocuments({
        'quality.deliveryPerformance.value': { $ne: null }
    });

    const companyInfo = await ESGData.countDocuments({
        'companyInfo.companyName': { $ne: null }
    });

    return [
        { name: 'Environment', value: environment },
        { name: 'Social', value: social },
        { name: 'Quality', value: quality },
        { name: 'Company Info', value: companyInfo }
    ];
};

// Get recent activities
const getRecentActivities = async () => {
    // Get the most recent ESG submissions
    const recentSubmissions = await ESGData.find({})
        .sort({ lastUpdated: -1 })
        .limit(5)
        .populate('userId', 'email name');

    // Map to activity format
    const activities = recentSubmissions.map(submission => {
        let action = 'updated ESG data';
        if (submission.status === 'submitted') {
            action = 'submitted ESG data for review';
        } else if (submission.status === 'reviewed') {
            action = 'had ESG data reviewed';
        } else if (submission.status === 'approved') {
            action = 'had ESG data approved';
        } else if (submission.status === 'rejected') {
            action = 'had ESG data rejected';
        }

        const timeAgo = getTimeAgo(submission.lastUpdated);

        return {
            id: submission._id,
            user: submission.userId?.email || 'Unknown User',
            action,
            time: timeAgo
        };
    });

    return activities;
};

// Helper to format time ago
const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
    if (diffHours > 0) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffMins > 0) {
        return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    return 'just now';
};

// Get all users with their details
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password -__v')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

// Create a new user
export const createUser = async (req, res) => {
    try {
        const { email, password, role, name } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const newUser = new User({
            email,
            password,
            role,
            name
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                name: newUser.name
            }
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
};

// Update a user's details
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role, name, isActive } = req.body;

        // Find user and update
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { email, role, name, isActive },
            { new: true }
        ).select('-password -__v');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
};

// Delete a user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete user
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
};

// Get all ESG submissions
export const getAllESGSubmissions = async (req, res) => {
    try {
        const submissions = await ESGData.find({})
            .populate('userId', 'name email')
            .sort({ lastUpdated: -1 });

        res.status(200).json({
            success: true,
            data: submissions
        });
    } catch (err) {
        console.error('Error fetching ESG submissions:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching ESG submissions'
        });
    }
};

// Get message analytics
export const getMessageAnalytics = async (req, res) => {
    try {
        // Get all chats
        const chats = await Chat.find({});

        // Calculate total messages by summing the length of the messages array in each chat
        const totalMessages = chats.reduce((sum, chat) => sum + chat.messages.length, 0);

        // Calculate unread messages
        const unreadMessages = chats.reduce((sum, chat) => {
            // Count unread messages in each chat
            const unreadCount = chat.messages.filter(message => !message.read).length;
            return sum + unreadCount;
        }, 0);

        // Get conversation count (each Chat document is one conversation)
        const totalConversations = chats.length;

        // Get messages per day (last 7 days)
        const messageTrend = await getMessageTrend();

        res.status(200).json({
            success: true,
            data: {
                totalMessages,
                unreadMessages,
                totalConversations,
                messageTrend
            }
        });
    } catch (err) {
        console.error('Error fetching message analytics:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching message analytics'
        });
    }
};

// Get message trend for the last 7 days
const getMessageTrend = async () => {
    const days = [];
    const now = new Date();

    // Generate last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const dayName = day.toLocaleString('default', { weekday: 'short' });
        days.push({
            name: dayName,
            startDate: new Date(day.setHours(0, 0, 0, 0)),
            endDate: new Date(day.setHours(23, 59, 59, 999))
        });
    }

    // Get message counts for each day
    const messagesByDay = await Promise.all(
        days.map(async (day) => {
            // Find all chats
            const chats = await Chat.find();

            // Count messages in each chat that were created on this day
            let count = 0;
            chats.forEach(chat => {
                const messagesOnDay = chat.messages.filter(message => {
                    const messageDate = new Date(message.timestamp);
                    return messageDate >= day.startDate && messageDate <= day.endDate;
                });
                count += messagesOnDay.length;
            });

            return {
                name: day.name,
                messages: count
            };
        })
    );

    return messagesByDay;
}; 