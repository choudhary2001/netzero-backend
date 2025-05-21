import mongoose from 'mongoose';

const supplierProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    companyName: {
        type: String,
        required: true
    },
    contactPerson: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    industry: {
        type: String
    },
    description: {
        type: String
    },
    website: {
        type: String
    },
    // ESG scores and metrics
    esgScores: {
        environmental: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        social: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        quality: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        governance: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        overall: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    // Record of form submissions
    formSubmissions: {
        environment: {
            submitted: {
                type: Boolean,
                default: false
            },
            lastUpdated: Date
        },
        social: {
            submitted: {
                type: Boolean,
                default: false
            },
            lastUpdated: Date
        },
        quality: {
            submitted: {
                type: Boolean,
                default: false
            },
            lastUpdated: Date
        },
        governance: {
            submitted: {
                type: Boolean,
                default: false
            },
            lastUpdated: Date
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
supplierProfileSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const SupplierProfile = mongoose.model('SupplierProfile', supplierProfileSchema);
export default SupplierProfile; 