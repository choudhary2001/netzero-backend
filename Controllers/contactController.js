import Contact from '../Models/Contact.js';
import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'netzerojourney@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your_app_password'
    }
});

// Submit a new contact form
export const submitContactForm = async (req, res) => {
    try {
        const { name, email, company, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Create new contact entry
        const newContact = new Contact({
            name,
            email,
            company: company || '',
            subject,
            message
        });

        // Save to database
        await newContact.save();

        // Send acknowledgement email to the user
        const mailOptions = {
            from: process.env.EMAIL_USER || 'netzerojourney@gmail.com',
            to: email,
            subject: 'We received your message - Net Zero Journey',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d8653;">Thank you for contacting us!</h2>
                    <p>Hello ${name},</p>
                    <p>We have received your message regarding: <strong>${subject}</strong></p>
                    <p>Our team will review your inquiry and get back to you as soon as possible. Your message is important to us.</p>
                    <p>For your reference, here's a copy of your message:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="font-style: italic;">${message}</p>
                    </div>
                    <p>If you have any additional information to share, please feel free to reply to this email.</p>
                    <p>Best regards,<br>The Net Zero Journey Team</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Acknowledgement email sent to:', email);
        } catch (emailError) {
            console.error('Error sending acknowledgement email:', emailError);
            // Continue with the response even if email fails
        }

        return res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon.',
            contact: newContact
        });
    } catch (error) {
        console.error('Error in submitContactForm:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request'
        });
    }
};

// Get all contact submissions (admin only)
export const getAllContacts = async (req, res) => {
    try {
        const { status, sort = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

        console.log('Received filter params:', { status, sort, order, page, limit });

        // Build filter object
        const filter = {};
        if (status && status.trim() !== '') {
            filter.status = status.trim();
        }

        console.log('Applying MongoDB filter:', filter);

        // Count total documents for pagination
        const total = await Contact.countDocuments(filter);

        // Get contacts with pagination and sorting
        const contacts = await Contact.find(filter)
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        console.log(`Found ${contacts.length} contacts matching filter`);

        return res.status(200).json({
            success: true,
            contacts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getAllContacts:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching contacts'
        });
    }
};

// Get a single contact by ID (admin only)
export const getContactById = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Mark as read if not already
        if (!contact.isRead) {
            contact.isRead = true;
            await contact.save();
        }

        return res.status(200).json({
            success: true,
            contact
        });
    } catch (error) {
        console.error('Error in getContactById:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the contact'
        });
    }
};

// Update contact status and admin notes (admin only)
export const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Track if status has changed
        const statusChanged = status && status !== contact.status;
        const oldStatus = contact.status;

        // Update fields if provided
        if (status) {
            contact.status = status;
        }

        if (adminNotes !== undefined) {
            contact.adminNotes = adminNotes;
        }

        await contact.save();

        // Send email notification if status has changed
        if (statusChanged) {
            try {
                // Prepare email content based on the new status
                let emailSubject, emailContent;

                switch (status) {
                    case 'in-progress':
                        emailSubject = `Your inquiry is being processed - ${contact.subject}`;
                        emailContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #e6a817;">We're Working on Your Request</h2>
                                <p>Hello ${contact.name},</p>
                                <p>We wanted to let you know that our team is actively working on your inquiry regarding: <strong>${contact.subject}</strong></p>
                                <p>We're currently reviewing the details you provided and will get back to you with more information as soon as possible.</p>
                                <p>If you have any additional information that might help us better assist you, please feel free to reply to this email.</p>
                                <p>Thank you for your patience.</p>
                                <p>Best regards,<br>The Net Zero Journey Team</p>
                            </div>
                        `;
                        break;
                    case 'resolved':
                        emailSubject = `Your inquiry has been resolved - ${contact.subject}`;
                        emailContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #2d8653;">Your Request Has Been Resolved</h2>
                                <p>Hello ${contact.name},</p>
                                <p>We're pleased to inform you that your inquiry regarding: <strong>${contact.subject}</strong> has been resolved.</p>
                                <p>We hope the resolution meets your expectations. If you have any further questions or need additional clarification, please don't hesitate to reach out to us.</p>
                                <p>We appreciate your interest in Net Zero Journey and look forward to supporting your sustainability initiatives.</p>
                                <p>Best regards,<br>The Net Zero Journey Team</p>
                            </div>
                        `;
                        break;
                    case 'new':
                        emailSubject = `Update on your inquiry - ${contact.subject}`;
                        emailContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #3b82f6;">Your Inquiry Has Been Updated</h2>
                                <p>Hello ${contact.name},</p>
                                <p>We're writing to inform you that your inquiry regarding: <strong>${contact.subject}</strong> has been updated to "New" status.</p>
                                <p>Our team will review your request soon. We appreciate your patience as we work through our support queue.</p>
                                <p>Best regards,<br>The Net Zero Journey Team</p>
                            </div>
                        `;
                        break;
                }

                // Send status update email
                const mailOptions = {
                    from: process.env.EMAIL_USER || 'netzerojourney@gmail.com',
                    to: contact.email,
                    subject: emailSubject,
                    html: emailContent
                };

                await transporter.sendMail(mailOptions);
                console.log(`Status update email sent to ${contact.email}. Status changed from ${oldStatus} to ${status}`);

            } catch (emailError) {
                console.error('Error sending status update email:', emailError);
                // Continue with the response even if email sending fails
            }
        }

        return res.status(200).json({
            success: true,
            contact,
            message: 'Contact updated successfully'
        });
    } catch (error) {
        console.error('Error in updateContact:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the contact'
        });
    }
};

// Delete a contact (admin only)
export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteContact:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the contact'
        });
    }
};

// Get contact stats for admin dashboard
export const getContactStats = async (req, res) => {
    try {
        const totalContacts = await Contact.countDocuments();
        const newContacts = await Contact.countDocuments({ status: 'new' });
        const inProgressContacts = await Contact.countDocuments({ status: 'in-progress' });
        const resolvedContacts = await Contact.countDocuments({ status: 'resolved' });
        const unreadContacts = await Contact.countDocuments({ isRead: false });

        return res.status(200).json({
            success: true,
            stats: {
                total: totalContacts,
                new: newContacts,
                inProgress: inProgressContacts,
                resolved: resolvedContacts,
                unread: unreadContacts
            }
        });
    } catch (error) {
        console.error('Error in getContactStats:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching contact statistics'
        });
    }
}; 