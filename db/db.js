import mongoose from 'mongoose';
import dotenv from 'dotenv';

const connectDB = async () => {
    try {
        console.log(
            "the connection we have build is", process.env.MONGO_DB_URL
        )
        await mongoose.connect(process.env.MONGO_DB_URL);
        console.log("Connected to MongoDB");
    }
    catch (err) {
        console.error("Error connecting to MongoDB", err);

    }
}
export default connectDB;
