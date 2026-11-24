const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const app = express();
const users = [];
const blogs = [];
let nextUserId = 1;
let nextBlogId = 1;

// Middleware
app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
    res.send("TechSphere Backend Server is Running!");
});
// Test API Route
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

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Check existing user
        const existingUser = users.find(user => user.email === email);

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store user
        const newUser = {
            id: nextUserId++,
            name,
            email,
            password: hashedPassword
        };

        users.push(newUser);

        res.status(201).json({
            message: "Registration successful!",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
});

// User Login API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find user
        const user = users.find(user => user.email === email);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        res.status(200).json({
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Create Blog API
app.post("/api/blogs", (req, res) => {
    const { title, category, content, author } = req.body;

    // Check required fields
    if (!title || !category || !content || !author) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    // Create new blog
    const newBlog = {
        id: nextBlogId++,
        title,
        category,
        content,
        author
    };

    blogs.push(newBlog);

    res.status(201).json({
        message: "Blog created successfully!",
        blog: newBlog
    });
});

// Get All Blogs API
app.get("/api/blogs", (req, res) => {
    res.status(200).json({
        message: "Blogs fetched successfully!",
        blogs: blogs
    });
});

// Get Single Blog API
app.get("/api/blogs/:id", (req, res) => {
    const blogId = parseInt(req.params.id);
    const blog = blogs.find(b => b.id === blogId);

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found!"
        });
    }

    res.status(200).json({
        message: "Blog fetched successfully!",
        blog: blog
    });
});

// Update Blog API
app.put("/api/blogs/:id", (req, res) => {
    const blogId = parseInt(req.params.id);
    const { title, category, content } = req.body;

    // Check required fields
    if (!title || !category || !content) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const blog = blogs.find(b => b.id === blogId);

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found!"
        });
    }

    blog.title = title;
    blog.category = category;
    blog.content = content;

    res.status(200).json({
        message: "Blog updated successfully!",
        blog: blog
    });
});

// Delete Blog API
app.delete("/api/blogs/:id", (req, res) => {

    const blogId = parseInt(req.params.id);

    const blogIndex = blogs.findIndex(function(blog) {
        return blog.id === blogId;
    });

    if (blogIndex === -1) {
        return res.status(404).json({
            message: "Blog not found!"
        });
    }

    blogs.splice(blogIndex, 1);

    res.status(200).json({
        message: "Blog deleted successfully!"
    });

});
// Start Server
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});