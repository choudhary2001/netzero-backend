import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: [
            'supplier', 'admin', 'company'
        ]
    },
    date: {
        type: Date,
        default: Date.now
    }
});
const User = mongoose.model('User', userSchema);
export default User;