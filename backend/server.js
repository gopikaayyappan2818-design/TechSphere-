const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const supabase = require("./config/supabase");

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

// Format Blog Response
const formatBlog = (blog) => ({
    id: blog.id,
    _id: blog.id,
    title: blog.title,
    category: blog.category,
    content: blog.content,
    author: blog.author,
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

        res.status(201).json({
            message: "Registration successful!",
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

        res.status(200).json({
            message: "Login successful!",
            user: formatUser(user)
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Create Blog API
app.post("/api/blogs", async (req, res) => {
    try {
        const { title, category, content, author } = req.body;

        if (!title || !category || !content || !author) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const { data: newBlog, error } = await supabase
            .from("blogs")
            .insert({
                title: title.trim(),
                category: category.trim(),
                content: content.trim(),
                author: author.trim()
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

// Update Blog API
app.put("/api/blogs/:id", async (req, res) => {
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

        const { data: updatedBlog, error } = await supabase
            .from("blogs")
            .update({
                title: title.trim(),
                category: category.trim(),
                content: content.trim(),
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
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

// Delete Blog API
app.delete("/api/blogs/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(404).json({
                message: "Blog not found!"
            });
        }

        const { data: deletedBlog, error } = await supabase
            .from("blogs")
            .delete()
            .eq("id", id)
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

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});