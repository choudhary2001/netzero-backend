import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './Models/user.js'; // Adjust the path if your User model is located elsewhere

// --- Configuration ---
const MONGO_URI = 'mongodb+srv://raj070878:Rajesh1234@netzero.azmkj.mongodb.net/?retryWrites=true&w=majority&appName=NetZero/NetZero'; // Replace with your actual MongoDB connection string
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin'; // The script will hash this password
const ADMIN_ROLE = 'admin';
const SALT_ROUNDS = 10; // Standard number of salt rounds for bcrypt

// --- Script Logic ---
const createAdminUser = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Remove useCreateIndex and useFindAndModify if using Mongoose v6+
            // useCreateIndex: true, 
            // useFindAndModify: false,
        });
        console.log('Database connected successfully.');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
        if (existingAdmin) {
            console.log(`Admin user with email ${ADMIN_EMAIL} already exists.`);
            return; // Exit if admin already exists
        }

        console.log(`Creating admin user: ${ADMIN_EMAIL}`);

        // Hash the password
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
        console.log('Password hashed.');

        // Create the new admin user
        const newAdmin = new User({
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: ADMIN_ROLE,
        });

        // Save the user to the database
        await newAdmin.save();
        console.log(`Admin user ${ADMIN_EMAIL} created successfully!`);

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        // Ensure the database connection is closed
        await mongoose.disconnect();
        console.log('Database connection closed.');
    }
};

// Run the function
createAdminUser(); 