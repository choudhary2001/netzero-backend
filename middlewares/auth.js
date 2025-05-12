
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

//auth
export const verifyToken = async (req, res, next) => {

    // console.log("Printing token:", req.cookies?.["net-jwt-token"]);
    try {
        //extract token
        const token = req.cookies?.["net-jwt-token"] //we have get the cookie from backend and we have to send it to frontend
            || req.body?.["net-jwt-token"]
            || req.header("Authorization")?.replace("Bearer ", "");

        //if token missing, then return response
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'TOken is missing',
            });
        }

        //verify the token
        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            // console.log(decode);
            req.user = decode;
        }
        catch (err) {
            //verification - issue
            return res.status(401).json({
                success: false,
                message: 'token is invalid',
            });
        }
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Something went wrong while validating the token',
        });
    }
}

//isStudent
export const isSupplier = async (req, res, next) => {
    try {
        if (req.user.role !== "supplier") {
            return res.status(401).json({
                success: false,
                message: 'This is a protected route for supplier only',
            });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'User role cannot be verified, please try again'
        })
    }
}


//isInstructor
export const isCompany = async (req, res, next) => {
    try {
        if (req.user.role !== "company") {
            return res.status(401).json({
                success: false,
                message: 'This is a protected route for company only',
            });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'User role cannot be verified, please try again'
        })
    }
}


//isAdmin
export const isAdmin = async (req, res, next) => {
    try {
        console.log("Printing AccountType ", req.user.accountType);
        if (req.user.role !== "admin") {
            return res.status(401).json({
                success: false,
                message: 'This is a protected route for Admin only',
            });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'User role cannot be verified, please try again'
        })
    }
}


