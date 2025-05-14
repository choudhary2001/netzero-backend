import mongoose from 'mongoose';
const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
    }
});
const OTP = mongoose.model('OTP', otpSchema);
export default OTP;