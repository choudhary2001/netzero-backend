import User from '../Models/user.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import OTP from '../Models/otp.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import SupplierProfile from '../Models/supplierProfile.js';
import ESGData from '../Models/ESGData.js';

//this function is for login the user
export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ email: username });
    if (!existingUser) return res.status(404).json({ message: "User doesn't exist" });

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const access = jwt.sign(
      { id: existingUser._id, email: existingUser.email, role: existingUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refresh = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Send response (omit password)
    const { _id, name, role, email } = existingUser;
    res.status(200).json({
      access,
      refresh,
      user: { _id, name, email, role }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Generate new access token using refresh token
export const refreshToken = async (req, res) => {
  const { refresh } = req.body;

  if (!refresh) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    const decoded = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const access = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ access });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// Blacklist refresh token
export const blacklistToken = async (req, res) => {
  // In a production app, you would store blacklisted tokens in a database or Redis
  // For simplicity, we'll just acknowledge the logout
  res.status(200).json({ message: "Token successfully blacklisted" });
};

// Get current user info
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to generate OTP email template
const generateOTPEmailTemplate = (otp, type) => {
  const isRegistration = type === 'registration';
  const subject = isRegistration ? 'Account Verification' : 'Password Reset Request';
  const title = isRegistration ? 'Verify Your Account' : 'Reset Your Password';
  const message = isRegistration
    ? 'Thank you for registering with Net Zero Journey. Please use the OTP below to verify your account.'
    : 'You have requested to reset your password. Please use the OTP below to proceed with the password reset.';
  const expiryMessage = 'This OTP will expire in 10 minutes.';

  return {
    subject,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #2d8653 0%, #1a5c3a 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }
                    .logo {
                        max-width: 150px;
                        margin-bottom: 10px;
                    }
                    .content {
                        padding: 30px;
                        color: #333333;
                    }
                    .otp-container {
                        background-color: #f8f9fa;
                        border-radius: 6px;
                        padding: 20px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .otp-code {
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 5px;
                        color: #2d8653;
                        margin: 10px 0;
                    }
                    .footer {
                        background-color: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #666666;
                        border-top: 1px solid #eeeeee;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #2d8653;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        margin-top: 20px;
                    }
                    .warning {
                        color: #dc3545;
                        font-size: 14px;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="https://netzerojourney.org/logo.png" alt="Net Zero Journey Logo" class="logo" style="display: none; margin: 0 auto;">
                        <h1>${title}</h1>
                    </div>
                    <div class="content">
                        <p>${message}</p>
                        <div class="otp-container">
                            <p>Your OTP is:</p>
                            <div class="otp-code">${otp}</div>
                            <p class="warning">${expiryMessage}</p>
                        </div>
                        <p>If you didn't request this ${isRegistration ? 'verification' : 'password reset'}, please ignore this email or contact our support team if you have concerns.</p>
                        <p>Best regards,<br>The Net Zero Journey Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} Net Zero Journey. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
  };
};

//this is the function that sends the otp on registration of the user
export const register = async (req, res) => {
  const { name, email, password, role, companyName } = req.body;
  try {
    // Check if user already exists
    await OTP.deleteOne({ email });
    await OTP.deleteOne({ email: email });

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    const otp = Math.floor(1000 + Math.random() * 9000);
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const { subject, html } = generateOTPEmailTemplate(otp, 'registration');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html
    }

    const newOtp = new OTP({
      email: email,
      otp: otp,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // OTP expires in 10 minutes
    });

    await newOtp.save();

    const response = await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    // user = await User.create({
    //   name,
    //   email,
    //   password: hashedPassword,
    //   role,
    //   companyName
    // });

    // // If user is a supplier, create supplier profile and ESG data
    // if (role === 'supplier') {
    //   await SupplierProfile.create({
    //     supplierId: user._id,
    //     companyName,
    //     formSubmissions: {
    //       environment: { submitted: false },
    //       social: { submitted: false },
    //       governance: { submitted: false },
    //       quality: { submitted: false }
    //     }
    //   });

    //   await ESGData.create({
    //     supplierId: user._id,
    //     status: 'draft'
    //   });
    // }

    // // Generate JWT token
    // const token = jwt.sign(
    //   { id: user._id, role: user.role },
    //   process.env.JWT_SECRET,
    //   { expiresIn: '30d' }
    // );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while registering user'
    });
  }
};

export const verifyOTP = async (req, res) => {
  console.log("The verify otp function is called ");
  console.log(req.body, "this is the body");
  const { otp, data } = req.body;
  console.log(data, "this is the data", otp, "this is the otp");
  try {
    const existingOTP = await OTP.findOne({ otp: otp });
    if (!existingOTP) return res.status(404).json({ message: "Invalid OTP" });
    const isOTPExpired = existingOTP.expiresAt < Date.now();
    if (isOTPExpired) return res.status(400).json({ message: "OTP expired" });
    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash(data.password, salt);

    const user = new User({
      email: data.email,
      password: pass,
      role: data.role,
      name: data.name
    });
    try {
      await OTP.deleteOne({ email: data.email });
    }
    catch (err) {
      console.log("the error we have :", err);
    }
    await user.save();
    res.status(200).json({ msg: 'User registered successfully' });
  }
  catch (err) {
    console.log("the error we have :", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
export const logout = async (req, res) => {
  console.log("the logout function is called");
  try {
    res.clearCookie("net-jwt-token");
    res.status(200).json({ message: "User logged out successfully" });
  }
  catch (err) {
    console.log("the error we have :", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Password reset request
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const newOtp = new OTP({
      email: email,
      otp: otp,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // OTP expires in 10 minutes
    });

    await newOtp.save();

    // Send email with OTP
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const { subject, html } = generateOTPEmailTemplate(otp, 'password-reset');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset OTP sent to your email" });
  } catch (err) {
    console.error("Password reset request error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Find user and exclude password field
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // Create a response object with basic profile data
    const profileData = {
      _id: user._id,
      email: user.email,
      role: user.role,
      full_name: user.name || 'User', // Default if no name exists
    };

    // Add role-specific data
    if (user.role === 'supplier') {
      // Get supplier-specific profile
      const supplierProfile = await SupplierProfile.findOne({ userId: user._id });

      if (supplierProfile) {
        // Add supplier profile data
        profileData.companyName = supplierProfile.companyName;
        profileData.contactPerson = supplierProfile.contactPerson;
        profileData.phone = supplierProfile.phone;
        profileData.address = supplierProfile.address;
        profileData.industry = supplierProfile.industry;
        profileData.website = supplierProfile.website;
        profileData.esgScores = supplierProfile.esgScores;
        profileData.formSubmissions = supplierProfile.formSubmissions;
      } else {
        // If no supplier profile exists yet
        profileData.profileComplete = false;
      }
    } else if (user.role === 'admin') {
      // Add admin-specific data if needed
      profileData.adminLevel = "SuperAdmin";
    } else if (user.role === 'company') {
      // Add company-specific data if needed
      profileData.companyType = "Corporate";
    }

    res.status(200).json(profileData);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error while fetching profile" });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = req.body;

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.role;

    // Handle basic user data update (name, etc.)
    if (updateData.name) {
      user.name = updateData.name;
      await user.save();
    }

    // Handle role-specific profile updates
    if (user.role === 'supplier') {
      let supplierProfile = await SupplierProfile.findOne({ userId: user._id });

      if (!supplierProfile && updateData.companyName) {
        // Create new supplier profile if doesn't exist
        supplierProfile = new SupplierProfile({
          userId: user._id,
          companyName: updateData.companyName,
          contactPerson: updateData.contactPerson || updateData.name || user.name || 'Contact Person',
        });
      }

      if (supplierProfile) {
        // Update supplier profile fields
        const supplierFields = [
          'companyName', 'contactPerson', 'phone', 'address',
          'industry', 'description', 'website'
        ];

        supplierFields.forEach(field => {
          if (updateData[field] !== undefined) {
            // Ensure contactPerson is never empty
            if (field === 'contactPerson' && !updateData[field]) {
              supplierProfile[field] = user.name || 'Contact Person';
            } else {
              supplierProfile[field] = updateData[field];
            }
          }
        });

        // Handle nested ESG scores update if provided
        if (updateData.esgScores) {
          Object.keys(updateData.esgScores).forEach(key => {
            if (supplierProfile.esgScores[key] !== undefined) {
              supplierProfile.esgScores[key] = updateData.esgScores[key];
            }
          });

          // Calculate overall score from all four categories
          const { environmental, social, quality, governance } = supplierProfile.esgScores;
          supplierProfile.esgScores.overall = Math.round(
            (environmental + social + quality + governance) / 4
          );
        }

        // Handle form submission updates
        if (updateData.formSubmissions) {
          Object.keys(updateData.formSubmissions).forEach(formType => {
            if (supplierProfile.formSubmissions[formType] !== undefined) {
              if (updateData.formSubmissions[formType].submitted !== undefined) {
                supplierProfile.formSubmissions[formType].submitted =
                  updateData.formSubmissions[formType].submitted;

                // Update the last updated timestamp when form is submitted
                if (updateData.formSubmissions[formType].submitted) {
                  supplierProfile.formSubmissions[formType].lastUpdated = new Date();
                }
              }
            }
          });
        }

        await supplierProfile.save();

        // Return updated profile
        const updatedProfile = {
          ...user.toObject(),
          ...supplierProfile.toObject()
        };
        delete updatedProfile.password;

        return res.status(200).json(updatedProfile);
      }
    }

    // For other roles or if no role-specific profile was updated
    const updatedUser = await User.findById(userId).select('-password');
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error while updating profile" });
  }
};

// Verify OTP for password reset
export const verifyPasswordResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpRecord = await OTP.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const { email, otp, new_password } = req.body;

  try {
    // Verify OTP again
    const otpRecord = await OTP.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    user.password = hashedPassword;
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change password (for authenticated users)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Validate request
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while changing password"
    });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get additional data based on role
    let additionalData = {};
    if (user.role === 'supplier') {
      const [profile, esgData] = await Promise.all([
        SupplierProfile.findOne({ supplierId: userId }),
        ESGData.findOne({ supplierId: userId })
      ]);

      additionalData = {
        profile,
        esgData: esgData ? {
          status: esgData.status,
          overallScore: esgData.overallScore,
          completionStatus: {
            environment: calculateSectionCompletion(esgData.environment),
            social: calculateSectionCompletion(esgData.social),
            governance: calculateSectionCompletion(esgData.governance),
            quality: calculateSectionCompletion(esgData.quality)
          }
        } : null
      };
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        ...additionalData
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Don't allow role or password updates through this endpoint
    delete updateData.role;
    delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user profile'
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

const generatePartnerNotificationEmail = (partnerData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Value Chain Partner Submission</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #10B981 0%, #047857 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }
            .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-radius: 0 0 8px 8px;
            }
            .partner-info {
                background: #f9fafb;
                border-radius: 6px;
                padding: 20px;
                margin: 20px 0;
            }
            .info-row {
                margin-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 15px;
            }
            .info-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .label {
                font-weight: 600;
                color: #4b5563;
                margin-bottom: 5px;
            }
            .value {
                color: #1f2937;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }
            .logo {
                max-width: 150px;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://netzerojourney.org/logo.png" alt="Net Zero Journey Logo" class="logo">
                <h1>New Value Chain Partner Submission</h1>
                <p>A new partner has submitted their details for ESG improvement</p>
            </div>
            <div class="content">
                <p>Hello Net Zero Journey Team,</p>
                <p>A new value chain partner has submitted their details through the ESG improvement form. Please review the following information:</p>
                
                <div class="partner-info">
                    <div class="info-row">
                        <div class="label">Company Name</div>
                        <div class="value">${partnerData.companyName}</div>
                    </div>
                    <div class="info-row">
                        <div class="label">Contact Person</div>
                        <div class="value">${partnerData.contactName}</div>
                    </div>
                    <div class="info-row">
                        <div class="label">Email Address</div>
                        <div class="value">${partnerData.email}</div>
                    </div>
                    <div class="info-row">
                        <div class="label">Phone Number</div>
                        <div class="value">${partnerData.phone}</div>
                    </div>
                    <div class="info-row">
                        <div class="label">Company Address</div>
                        <div class="value">${partnerData.address}</div>
                    </div>
                    ${partnerData.industry ? `
                    <div class="info-row">
                        <div class="label">Industry</div>
                        <div class="value">${partnerData.industry}</div>
                    </div>
                    ` : ''}
                    ${partnerData.website ? `
                    <div class="info-row">
                        <div class="label">Website</div>
                        <div class="value">${partnerData.website}</div>
                    </div>
                    ` : ''}
                </div>

                <p>Please review this submission and take appropriate action to onboard this partner into our ESG improvement program.</p>
                
                <div class="footer">
                    <p>This is an automated message from Net Zero Journey's ESG Improvement System.</p>
                    <p>© ${new Date().getFullYear()} Net Zero Journey. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Add new API endpoint for partner submission
export const submitPartnerDetails = async (req, res) => {
  try {
    const {
      email,
      companyName,
      contactName,
      phone,
      address,
      industry,
      website
    } = req.body;

    // Validate required fields
    if (!email || !companyName || !contactName || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create partner data object
    const partnerData = {
      email,
      companyName,
      contactName,
      phone,
      address,
      industry,
      website,
      submittedAt: new Date()
    };
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Send notification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'info@netzerojourney.org',
      subject: `New Value Chain Partner: ${companyName}`,
      html: generatePartnerNotificationEmail(partnerData)
    };

    await transporter.sendMail(mailOptions);

    // TODO: Save partner data to database if needed
    // await Partner.create(partnerData);

    res.status(200).json({
      success: true,
      message: 'Partner details submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting partner details:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting partner details'
    });
  }
};





