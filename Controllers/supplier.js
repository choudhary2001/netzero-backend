import ESGData from '../Models/ESGData.js';
import SupplierProfile from '../Models/supplierProfile.js';
import User from '../Models/user.js';

// Get all suppliers
export const getAllSuppliers = async (req, res) => {
    try {
        // Find all users with supplier role
        const supplierUsers = await User.find({ role: 'supplier' }).select('-password');

        // Get supplier profiles for all supplier users
        const supplierIds = supplierUsers.map(user => user._id);
        const supplierProfiles = await SupplierProfile.find({ userId: { $in: supplierIds } });

        // Map profiles to users
        const suppliers = supplierUsers.map(user => {
            const profile = supplierProfiles.find(profile =>
                profile.userId.toString() === user._id.toString()
            );

            return {
                _id: user._id,
                email: user.email,
                name: user.name,
                profile: profile || null,
                profileComplete: !!profile
            };
        });

        res.status(200).json(suppliers);
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ message: 'Server error while fetching suppliers' });
    }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find supplier user
        const user = await User.findOne({ _id: id, role: 'supplier' }).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Find supplier profile
        const profile = await SupplierProfile.findOne({ userId: id });

        // Combine user and profile data
        const supplier = {
            _id: user._id,
            email: user.email,
            name: user.name,
            profile: profile || null,
            profileComplete: !!profile
        };

        res.status(200).json(supplier);
    } catch (err) {
        console.error('Error fetching supplier:', err);
        res.status(500).json({ message: 'Server error while fetching supplier' });
    }
};

// Update supplier ESG scores
export const updateEsgScores = async (req, res) => {
    try {
        const { id } = req.params;
        const { environmental, social, quality, governance } = req.body;

        // Find supplier profile
        let profile = await SupplierProfile.findOne({ userId: id });

        if (!profile) {
            // Find user to verify it's a supplier
            const user = await User.findOne({ _id: id, role: 'supplier' });

            if (!user) {
                return res.status(404).json({ message: 'Supplier not found' });
            }

            // Create new profile if doesn't exist
            profile = new SupplierProfile({
                userId: id,
                companyName: 'Company Name', // Placeholder
                contactPerson: user.name || 'Contact Person' // Placeholder
            });
        }

        // Update ESG scores
        if (environmental !== undefined) {
            profile.esgScores.environmental = environmental;
        }

        if (social !== undefined) {
            profile.esgScores.social = social;
        }

        if (quality !== undefined) {
            profile.esgScores.quality = quality;
        }

        if (governance !== undefined) {
            profile.esgScores.governance = governance;
        }

        // Calculate overall score
        profile.esgScores.overall = Math.round(
            (profile.esgScores.environmental +
                profile.esgScores.social +
                profile.esgScores.quality +
                profile.esgScores.governance) / 4
        );

        await profile.save();

        res.status(200).json(profile.esgScores);
    } catch (err) {
        console.error('Error updating ESG scores:', err);
        res.status(500).json({ message: 'Server error while updating ESG scores' });
    }
};

// Update form submission status
export const updateFormSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { formType, submitted } = req.body;

        if (!['environment', 'social', 'quality'].includes(formType)) {
            return res.status(400).json({ message: 'Invalid form type' });
        }

        // Find supplier profile
        let profile = await SupplierProfile.findOne({ userId: id });

        if (!profile) {
            // Find user to verify it's a supplier
            const user = await User.findOne({ _id: id, role: 'supplier' });

            if (!user) {
                return res.status(404).json({ message: 'Supplier not found' });
            }

            // Create new profile if doesn't exist
            profile = new SupplierProfile({
                userId: id,
                companyName: 'Company Name', // Placeholder
                contactPerson: user.name || 'Contact Person' // Placeholder
            });
        }

        // Update form submission status
        profile.formSubmissions[formType].submitted = submitted;

        if (submitted) {
            profile.formSubmissions[formType].lastUpdated = new Date();
        }

        await profile.save();

        res.status(200).json(profile.formSubmissions);
    } catch (err) {
        console.error('Error updating form submission:', err);
        res.status(500).json({ message: 'Server error while updating form submission' });
    }
};

// Get supplier dashboard data
export const getSupplierDashboard = async (req, res) => {
    try {
        const { supplierId } = req.params;

        // Get ESG data
        const esgData = await ESGData.findOne({ supplierId });
        if (!esgData) {
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        }

        // Get supplier profile
        const profile = await SupplierProfile.findOne({ supplierId });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Supplier profile not found'
            });
        }

        // Calculate completion status
        const completionStatus = {
            environment: calculateSectionCompletion(esgData.environment),
            social: calculateSectionCompletion(esgData.social),
            governance: calculateSectionCompletion(esgData.governance),
            quality: calculateSectionCompletion(esgData.quality)
        };

        // Calculate overall score
        const overallScore = calculateOverallScore(esgData);

        res.status(200).json({
            success: true,
            data: {
                esgData,
                profile,
                completionStatus,
                overallScore,
                formStatus: profile.formSubmissions
            }
        });
    } catch (error) {
        console.error('Error fetching supplier dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching supplier dashboard'
        });
    }
};

// Get supplier ESG data
export const getSupplierESGData = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { section } = req.query;

        const query = { supplierId };
        if (section) {
            query[`${section}`] = { $exists: true };
        }

        const esgData = await ESGData.findOne(query);
        if (!esgData) {
            return res.status(404).json({
                success: false,
                message: 'ESG data not found'
            });
        }

        const profile = await SupplierProfile.findOne({ supplierId });

        res.status(200).json({
            success: true,
            data: {
                esgData: section ? esgData[section] : esgData,
                formStatus: profile?.formSubmissions || {}
            }
        });
    } catch (error) {
        console.error('Error fetching supplier ESG data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching supplier ESG data'
        });
    }
};

// Helper function to calculate section completion
const calculateSectionCompletion = (sectionData) => {
    if (!sectionData) return 0;

    const subsections = Object.keys(sectionData);
    if (subsections.length === 0) return 0;

    const completedSubsections = subsections.filter(subsection => {
        const data = sectionData[subsection];
        return data && (
            (data.value !== undefined && data.value !== '') ||
            (data.baseline !== undefined && data.baseline !== '') ||
            (data.chemicalManagement !== undefined && data.chemicalManagement !== '') ||
            (data.ltifr !== undefined && data.ltifr !== '') ||
            (data.humanRightsPolicy !== undefined && data.humanRightsPolicy !== '')
        );
    });

    return (completedSubsections.length / subsections.length) * 100;
};

// Helper function to calculate overall score
const calculateOverallScore = (esgData) => {
    if (!esgData) return 0;

    const sections = ['environment', 'social', 'governance', 'quality'];
    let totalPoints = 0;
    let totalWeight = 0;

    sections.forEach(section => {
        if (esgData[section]) {
            const sectionData = esgData[section];
            const subsections = Object.keys(sectionData);

            subsections.forEach(subsection => {
                const data = sectionData[subsection];
                if (data && data.points) {
                    totalPoints += data.points;
                    totalWeight += 1;
                }
            });
        }
    });

    return totalWeight > 0 ? (totalPoints / totalWeight) : 0;
};

// Get supplier profile
export const getSupplierProfile = async (req, res) => {
    try {
        const { supplierId } = req.params;

        const profile = await SupplierProfile.findOne({ supplierId })
            .populate('supplierId', 'name email companyName');

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Supplier profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Error fetching supplier profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching supplier profile'
        });
    }
};

// Update supplier profile
export const updateSupplierProfile = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const updateData = req.body;

        const updatedProfile = await SupplierProfile.findOneAndUpdate(
            { supplierId },
            { $set: updateData },
            { new: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: 'Supplier profile not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Supplier profile updated successfully',
            data: updatedProfile
        });
    } catch (error) {
        console.error('Error updating supplier profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating supplier profile'
        });
    }
}; 