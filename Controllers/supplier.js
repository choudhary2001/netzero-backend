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
        const { environmental, social, governance } = req.body;

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

        if (governance !== undefined) {
            profile.esgScores.governance = governance;
        }

        // Calculate overall score
        profile.esgScores.overall = Math.round(
            (profile.esgScores.environmental + profile.esgScores.social + profile.esgScores.governance) / 3
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

        if (!['environment', 'social', 'governance'].includes(formType)) {
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