const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const supabase = require("./config/supabase");
const authenticateToken = require("./middleware/auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// UUID Validation
const isValidUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Format User Response
const formatUser = (user) => ({
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email
});

// Generate Signed JWT Token
const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured in environment variables");
    }
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// Format Blog Response
const formatBlog = (blog) => ({
    id: blog.id,
    _id: blog.id,
    title: blog.title,
    category: blog.category,
    content: blog.content,
    author: blog.author,
    userId: blog.user_id || null,
    createdAt: blog.created_at,
    updatedAt: blog.updated_at
});

// Test API
app.get("/", (req, res) => {
    res.send("TechSphere Backend Server is Running!");
});

// API Welcome Route
app.get("/api", (req, res) => {
    res.json({
        message: "Welcome to TechSphere API!",
        status: "Success"
    });
});

// User Registration API
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check existing user
        const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into Supabase
        const { data: newUser, error } = await supabase
            .from("users")
            .insert({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword
            })
            .select("id, name, email")
            .single();

        if (error) throw error;

        const token = generateToken(newUser);

        res.status(201).json({
            message: "Registration successful!",
            token,
            user: formatUser(newUser)
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// User Login API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user in Supabase
        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, password")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        const token = generateToken(user);

        res.status(200).json({
            message: "Login successful!",
            token,
            user: formatUser(user)
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Password Reset Helpers
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const hashResetToken = (rawToken) => {
    return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const createEmailTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error("Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });
};

// Forgot Password API
app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const genericMessage = "If an account with that email exists, a password reset link has been sent.";

        const { data: user, error: findError } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (findError) throw findError;

        // Never reveal whether the email is registered
        if (!user) {
            return res.status(200).json({ message: genericMessage });
        }

        const transporter = createEmailTransporter();
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        const { error: updateError } = await supabase
            .from("users")
            .update({
                reset_token_hash: tokenHash,
                reset_token_expires: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq("id", user.id);

        if (updateError) throw updateError;

        const frontendBase = (process.env.FRONTEND_URL || "http://127.0.0.1:5500").replace(/\/+$/, "");
        const resetUrl = `${frontendBase}/reset-password.html?token=${encodeURIComponent(rawToken)}`;

        try {
            await transporter.sendMail({
                from: `"TechSphere Support" <${fromAddress}>`,
                to: user.email,
                subject: "TechSphere Password Reset Request",
                text: `Hello ${user.name},\n\nYou requested a password reset for your TechSphere account.\nClick the link below to set a new password (valid for 15 minutes):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #4f46e5; margin-top: 0;">TechSphere Password Reset</h2>
                        <p>Hello ${user.name},</p>
                        <p>You requested a password reset for your TechSphere account. Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.</p>
                        <p style="margin: 24px 0;">
                            <a href="${resetUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                        </p>
                        <p style="font-size: 13px; color: #64748b;">If you did not request a password reset, please ignore this email.</p>
                    </div>
                `
            });
        } catch (mailError) {
            // Roll back unused token if email delivery fails
            await supabase
                .from("users")
                .update({ reset_token_hash: null, reset_token_expires: null })
                .eq("id", user.id);
            throw mailError;
        }

        return res.status(200).json({ message: genericMessage });
    } catch (error) {
        console.error("Forgot password error:", error.message);
        return res.status(500).json({
            message: "Unable to process password reset request right now."
        });
    }
});

// Verify Reset Token API
app.get("/api/verify-reset-token", async (req, res) => {
    try {
        const rawToken = typeof req.query.token === "string" ? req.query.token.trim() : "";
        if (!rawToken) {
            return res.status(400).json({
                valid: false,
                message: "Reset token is required."
            });
        }

        const tokenHash = hashResetToken(rawToken);
        const { data: user, error } = await supabase
            .from("users")
            .select("id, reset_token_expires")
            .eq("reset_token_hash", tokenHash)
            .maybeSingle();

        if (error) throw error;

        if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) <= new Date()) {
            return res.status(400).json({
                valid: false,
                message: "Invalid or expired reset link. Please request a new one."
            });
        }

        return res.status(200).json({ valid: true });
    } catch (error) {
        console.error("Verify reset token error:", error.message);
        return res.status(500).json({
            valid: false,
            message: "Unable to verify reset token."
        });
    }
});

// Reset Password API
app.post("/api/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const rawToken = typeof token === "string" ? token.trim() : "";

        if (!rawToken || !newPassword) {
            return res.status(400).json({
                message: "Reset token and new password are required."
            });
        }

        if (typeof newPassword !== "string" || newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long."
            });
        }

        const tokenHash = hashResetToken(rawToken);
        const { data: user, error: findError } = await supabase
            .from("users")
            .select("id, reset_token_expires")
            .eq("reset_token_hash", tokenHash)
            .maybeSingle();

        if (findError) throw findError;

        if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) <= new Date()) {
            return res.status(400).json({
                message: "Invalid or expired reset token."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error: updateError } = await supabase
            .from("users")
            .update({
                password: hashedPassword,
                reset_token_hash: null,
                reset_token_expires: null,
                updated_at: new Date().toISOString()
            })
            .eq("id", user.id)
            .eq("reset_token_hash", tokenHash);

        if (updateError) throw updateError;

        return res.status(200).json({
            message: "Password has been reset successfully! You can now login."
        });
    } catch (error) {
        console.error("Reset password error:", error.message);
        return res.status(500).json({
            message: "Server error while resetting password."
        });
    }
});

// Authenticated User Profile API
app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, created_at, updated_at")
            .eq("id", req.user.id)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile fetched successfully!",
            user: {
                ...formatUser(user),
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Get Authenticated User's Blogs API
app.get("/api/my-blogs", authenticateToken, async (req, res) => {
    try {
        const { data: blogs, error } = await supabase
            .from("blogs")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.status(200).json({
            message: "User blogs fetched successfully!",
            blogs: blogs.map(formatBlog)
        });
    } catch (error) {
        console.error("Get my-blogs error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Create Blog API (Protected)
app.post("/api/blogs", authenticateToken, async (req, res) => {
    try {
        const { title, category, content } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({
                message: "Title, category, and content are required"
            });
        }

        const { data: newBlog, error } = await supabase
            .from("blogs")
            .insert({
                title: title.trim(),
                category: category.trim(),
                content: content.trim(),
                author: req.user.name,
                user_id: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: "Blog created successfully!",
            blog: formatBlog(newBlog)
        });

    } catch (error) {
        console.error("Create blog error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Get All Blogs API
app.get("/api/blogs", async (req, res) => {
    try {
        const { data: blogs, error } = await supabase
            .from("blogs")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.status(200).json({
            message: "Blogs fetched successfully!",
            blogs: blogs.map(formatBlog)
        });

    } catch (error) {
        console.error("Get blogs error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Get Single Blog API
app.get("/api/blogs/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        const { data: blog, error } = await supabase
            .from("blogs")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!blog) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        res.status(200).json({
            message: "Blog fetched successfully!",
            blog: formatBlog(blog)
        });

    } catch (error) {
        console.error("Get single blog error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Update Blog API (Protected + Owner Only)
app.put("/api/blogs/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        const { title, category, content } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const { data: existingBlog, error: fetchError } = await supabase
            .from("blogs")
            .select("id, user_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingBlog) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        if (!existingBlog.user_id || existingBlog.user_id !== req.user.id) {
            return res.status(403).json({
                message: "Forbidden: You are not allowed to update this blog."
            });
        }

        const { data: updatedBlog, error } = await supabase
            .from("blogs")
            .update({
                title: title.trim(),
                category: category.trim(),
                content: content.trim(),
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!updatedBlog) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        res.status(200).json({
            message: "Blog updated successfully!",
            blog: formatBlog(updatedBlog)
        });

    } catch (error) {
        console.error("Update blog error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Delete Blog API (Protected + Owner Only)
app.delete("/api/blogs/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        const { data: existingBlog, error: fetchError } = await supabase
            .from("blogs")
            .select("id, user_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingBlog) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        if (!existingBlog.user_id || existingBlog.user_id !== req.user.id) {
            return res.status(403).json({
                message: "Forbidden: You are not allowed to delete this blog."
            });
        }

        const { data: deletedBlog, error } = await supabase
            .from("blogs")
            .delete()
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select("id")
            .maybeSingle();

        if (error) throw error;

        if (!deletedBlog) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        res.status(200).json({
            message: "Blog deleted successfully!"
        });

    } catch (error) {
        console.error("Delete blog error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// API 404 Handler (always return JSON for unknown /api routes)
app.use("/api", (req, res) => {
    res.status(404).json({
        message: "API endpoint not found."
    });
});

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});