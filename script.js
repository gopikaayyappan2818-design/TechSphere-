// ==========================================================================
// TechSphere Core JavaScript Engine
// UI/UX Enhancements, Rich Text Editor, HTML Sanitizer (XSS Defense), API Sync
// ==========================================================================

const API_BASE = "http://localhost:3000/api";

// --------------------------------------------------------------------------
// 1. Utility Functions: HTML Sanitization & Safety
// --------------------------------------------------------------------------

/**
 * Escapes plain text to avoid accidental HTML rendering
 */
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Sanitizes user-generated HTML to allow safe rich text formatting
 * while strictly eliminating XSS attack vectors.
 */
function sanitizeHTML(dirtyHtml) {
    if (!dirtyHtml) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, "text/html");

    const allowedTags = new Set([
        "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "a", "blockquote", "code", "pre", "span"
    ]);

    function clean(node) {
        const children = Array.from(node.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();

                // If tag is not in safe allowlist, replace with text representation
                if (!allowedTags.has(tagName)) {
                    const textNode = document.createTextNode(child.textContent);
                    node.replaceChild(textNode, child);
                    continue;
                }

                // Filter attributes
                const attrs = Array.from(child.attributes);
                for (const attr of attrs) {
                    const attrName = attr.name.toLowerCase();

                    // Only allow safe links
                    if (tagName === "a" && attrName === "href") {
                        const href = attr.value.trim().toLowerCase();
                        if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
                            child.setAttribute("target", "_blank");
                            child.setAttribute("rel", "noopener noreferrer");
                        } else {
                            child.removeAttribute(attr.name);
                        }
                    } else {
                        // Strip all event handlers (onclick, onerror, etc.) and arbitrary styles
                        child.removeAttribute(attr.name);
                    }
                }

                clean(child);
            }
        }
    }

    clean(doc.body);
    return doc.body.innerHTML;
}

// --------------------------------------------------------------------------
// 2. Navigation & Mobile Drawer
// --------------------------------------------------------------------------

function setupNavigation() {
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu") || document.querySelector("nav");

    if (menuToggle && navMenu) {
        menuToggle.addEventListener("click", function () {
            navMenu.classList.toggle("active");
        });
    }

    // Dynamic Navigation Bar links based on logged-in state
    const user = JSON.parse(localStorage.getItem("techUser"));
    if (navMenu) {
        if (user) {
            navMenu.innerHTML = `
                <a href="index.html">Home</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="create-blog.html" class="nav-cta">✍️ Write Article</a>
                <a href="#" id="logout">Logout</a>
            `;
        } else {
            navMenu.innerHTML = `
                <a href="index.html">Home</a>
                <a href="login.html">Login</a>
                <a href="register.html" class="nav-cta">Register</a>
            `;
        }

        // Attach Logout Event
        const logoutBtn = document.getElementById("logout");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", function (event) {
                event.preventDefault();
                localStorage.removeItem("techUser");
                alert("You have been logged out successfully!");
                window.location.href = "login.html";
            });
        }
    }
}

// --------------------------------------------------------------------------
// 3. Smooth Scrolling & Exploration
// --------------------------------------------------------------------------

const exploreButton = document.getElementById("exploreBtn") || document.querySelector(".hero button");
if (exploreButton) {
    exploreButton.addEventListener("click", function () {
        const blogsSection = document.getElementById("blogs");
        if (blogsSection) {
            blogsSection.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// Static blog cards "Read More"
const staticReadButtons = document.querySelectorAll("#blogs .blog-card button");
staticReadButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const card = this.closest(".blog-card");
        const title = card.querySelector("h3") ? card.querySelector("h3").textContent : "Article";
        const content = card.querySelector(".blog-content-body") ? card.querySelector(".blog-content-body").textContent : "";
        openArticleModal(title, "TechSphere Editorial", "Featured", content);
    });
});

// --------------------------------------------------------------------------
// 4. Modal for Reading Full Articles
// --------------------------------------------------------------------------

function openArticleModal(title, author, category, formattedContent) {
    let modal = document.getElementById("articleModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "articleModal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 2000; padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 16px; max-width: 720px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                    <div>
                        <span id="modalCategory" class="card-tag" style="margin-bottom: 0;"></span>
                    </div>
                    <button id="closeModalBtn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; padding: 4px;">&times;</button>
                </div>
                <div style="padding: 28px 24px; overflow-y: auto;">
                    <h2 id="modalTitle" style="font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 10px; line-height: 1.3;"></h2>
                    <div id="modalAuthor" style="font-size: 13.5px; color: #64748b; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;"></div>
                    <div id="modalContent" style="color: #334155; font-size: 15.5px; line-height: 1.8;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener("click", function (e) {
            if (e.target === modal) modal.style.display = "none";
        });

        document.getElementById("closeModalBtn").addEventListener("click", function () {
            modal.style.display = "none";
        });
    }

    document.getElementById("modalCategory").textContent = category;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalAuthor").textContent = `Published by ${author} • TechSphere Articles`;
    document.getElementById("modalContent").innerHTML = sanitizeHTML(formattedContent);
    modal.style.display = "flex";
}

// --------------------------------------------------------------------------
// 5. Authentication: Login & Registration
// --------------------------------------------------------------------------

// User Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("techUser", JSON.stringify(data.user));
                alert(data.message || "Login successful!");
                window.location.href = "dashboard.html";
            } else {
                alert(data.message || "Invalid credentials!");
            }
        } catch (error) {
            alert("Unable to connect to backend server. Make sure the Node.js server is running on port 3000.");
            console.error("Login Error:", error);
        }
    });
}

// User Registration
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            alert("Password should be at least 6 characters long.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || "Registration successful!");
                window.location.href = "login.html";
            } else {
                alert(data.message || "Registration failed!");
            }
        } catch (error) {
            alert("Unable to connect to backend server!");
            console.error("Registration Error:", error);
        }
    });
}

// --------------------------------------------------------------------------
// 6. Rich Text Blog Editor: Create & Update
// --------------------------------------------------------------------------

const blogForm = document.getElementById("blogForm");
if (blogForm) {
    // Auth Guard: Require login
    const user = JSON.parse(localStorage.getItem("techUser"));
    if (!user) {
        alert("Please login first to create or edit articles!");
        window.location.href = "login.html";
    }

    const richEditor = document.getElementById("richEditor");
    const blogContent = document.getElementById("blogContent");
    const editorToolbar = document.getElementById("editorToolbar");
    const urlParams = new URLSearchParams(window.location.search);
    const editBlogId = urlParams.get("id");
    const formHeading = document.querySelector(".login-container h2");
    const submitBtn = blogForm.querySelector("button[type='submit']");

    // Initialize Rich Editor Toolbar Buttons
    if (editorToolbar && richEditor) {
        const toolbarButtons = editorToolbar.querySelectorAll(".toolbar-btn");

        toolbarButtons.forEach(button => {
            button.addEventListener("click", function (e) {
                e.preventDefault();
                const command = this.getAttribute("data-command");
                const val = this.getAttribute("data-val") || null;

                richEditor.focus();

                if (command === "createLink") {
                    const url = prompt("Enter website URL (e.g. https://example.com):", "https://");
                    if (url && url.trim() !== "" && url !== "https://") {
                        document.execCommand("createLink", false, url.trim());
                    }
                } else if (command === "formatBlock") {
                    document.execCommand("formatBlock", false, `<${val}>`);
                } else {
                    document.execCommand(command, false, val);
                }

                syncEditorContent();
            });
        });

        // Sync content changes
        function syncEditorContent() {
            if (blogContent && richEditor) {
                blogContent.value = richEditor.innerHTML.trim();
            }
        }

        richEditor.addEventListener("input", syncEditorContent);
        richEditor.addEventListener("blur", syncEditorContent);
    }

    // Load blog data if in edit mode
    if (editBlogId) {
        if (formHeading) formHeading.textContent = "Edit Your Blog";
        if (submitBtn) submitBtn.textContent = "Update Blog Article";

        fetch(`${API_BASE}/blogs/${editBlogId}`)
            .then(res => res.json())
            .then(data => {
                if (data.blog) {
                    document.getElementById("blogTitle").value = data.blog.title;
                    document.getElementById("category").value = data.blog.category;

                    const safeHtml = sanitizeHTML(data.blog.content);
                    if (richEditor) richEditor.innerHTML = safeHtml;
                    if (blogContent) blogContent.value = safeHtml;
                } else {
                    alert("Blog not found!");
                    window.location.href = "dashboard.html";
                }
            })
            .catch(err => {
                console.error("Error loading blog details:", err);
                alert("Failed to load blog for editing.");
            });
    }

    // Submit handler
    blogForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const title = document.getElementById("blogTitle").value.trim();
        const category = document.getElementById("category").value;
        const rawContent = richEditor ? richEditor.innerHTML.trim() : blogContent.value.trim();

        // Check if content is actually non-empty
        const textCheck = richEditor ? richEditor.textContent.trim() : rawContent.trim();
        if (!textCheck) {
            alert("Please write some content for your blog article!");
            if (richEditor) richEditor.focus();
            return;
        }

        // Sanitize before submitting
        const sanitizedContent = sanitizeHTML(rawContent);

        const currentUser = JSON.parse(localStorage.getItem("techUser"));
        if (!currentUser) {
            alert("Please login first!");
            window.location.href = "login.html";
            return;
        }

        try {
            let url = `${API_BASE}/blogs`;
            let method = "POST";
            let body = {
                title,
                category,
                content: sanitizedContent,
                author: currentUser.name
            };

            if (editBlogId) {
                url = `${API_BASE}/blogs/${editBlogId}`;
                method = "PUT";
                body = {
                    title,
                    category,
                    content: sanitizedContent
                };
            }

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || (editBlogId ? "Blog updated successfully!" : "Blog created successfully!"));
                window.location.href = "dashboard.html";
            } else {
                alert(data.message || "Failed to save blog!");
            }
        } catch (error) {
            alert("Unable to connect to backend server!");
            console.error("Save Blog Error:", error);
        }
    });
}

// --------------------------------------------------------------------------
// 7. Community Published Blogs (Homepage)
// --------------------------------------------------------------------------

const publishedBlogs = document.getElementById("publishedBlogs");
if (publishedBlogs) {
    async function loadPublishedBlogs() {
        try {
            const response = await fetch(`${API_BASE}/blogs`);
            const data = await response.json();

            publishedBlogs.innerHTML = "";

            if (!data.blogs || data.blogs.length === 0) {
                publishedBlogs.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                        <p style="color: #64748b; font-size: 16px; margin-bottom: 15px;">No community articles published yet. Be the first to share your insights!</p>
                        <a href="create-blog.html" class="btn btn-primary">✍️ Write First Article</a>
                    </div>
                `;
                return;
            }

            data.blogs.forEach(function (blog) {
                const blogCard = document.createElement("div");
                blogCard.className = "blog-card";

                const safeCategory = escapeHTML(blog.category);
                const safeTitle = escapeHTML(blog.title);
                const safeAuthor = escapeHTML(blog.author || "Tech Enthusiast");
                const safePreview = sanitizeHTML(blog.content);
                const authorInitial = safeAuthor.charAt(0).toUpperCase();

                blogCard.innerHTML = `
                    <div>
                        <span class="card-tag">${safeCategory}</span>
                        <h3>${safeTitle}</h3>
                        <div class="blog-content-body">${safePreview}</div>
                    </div>
                    <div>
                        <div class="card-meta">
                            <div class="author-badge">${authorInitial}</div>
                            <span>By ${safeAuthor}</span>
                        </div>
                        <button type="button" class="btn btn-outline" style="width: 100%; margin-top: 15px;">Read Full Article</button>
                    </div>
                `;

                // Attach modal read handler
                const readBtn = blogCard.querySelector("button");
                readBtn.addEventListener("click", function () {
                    openArticleModal(blog.title, blog.author, blog.category, blog.content);
                });

                publishedBlogs.appendChild(blogCard);
            });
        } catch (error) {
            console.error("Error loading published blogs:", error);
            publishedBlogs.innerHTML = `<p style="color: #ef4444; grid-column: 1 / -1; text-align: center;">Unable to load blogs. Please verify backend server is running.</p>`;
        }
    }

    loadPublishedBlogs();
}

// --------------------------------------------------------------------------
// 8. Creator Dashboard: User Blogs Management
// --------------------------------------------------------------------------

const dashboardBlogs = document.getElementById("dashboardBlogs");
if (dashboardBlogs) {
    async function loadDashboardBlogs() {
        const user = JSON.parse(localStorage.getItem("techUser"));
        const welcomeMessage = document.getElementById("welcomeMessage");

        if (!user) {
            alert("Please login first to view your dashboard!");
            window.location.href = "login.html";
            return;
        }

        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user.name}!`;
        }

        try {
            const response = await fetch(`${API_BASE}/blogs`);
            const data = await response.json();

            dashboardBlogs.innerHTML = "";

            const myBlogs = (data.blogs || []).filter(blog => blog.author === user.name);

            // Update stats counter
            const blogCountEl = document.getElementById("userBlogCount");
            if (blogCountEl) blogCountEl.textContent = myBlogs.length;

            if (myBlogs.length === 0) {
                dashboardBlogs.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: white; border-radius: 14px; border: 1.5px dashed #cbd5e1;">
                        <h3 style="font-size: 20px; color: #0f172a; margin-bottom: 8px;">You haven't written any articles yet</h3>
                        <p style="color: #64748b; font-size: 15px; margin-bottom: 20px;">Share your technology knowledge, coding tutorials, or industry insights with the community.</p>
                        <a href="create-blog.html" class="btn btn-primary">✍️ Create Your First Blog</a>
                    </div>
                `;
                return;
            }

            myBlogs.forEach(function (blog) {
                const blogCard = document.createElement("div");
                blogCard.className = "blog-card";

                const safeCategory = escapeHTML(blog.category);
                const safeTitle = escapeHTML(blog.title);
                const safePreview = sanitizeHTML(blog.content);

                blogCard.innerHTML = `
                    <div>
                        <span class="card-tag">${safeCategory}</span>
                        <h3>${safeTitle}</h3>
                        <div class="blog-content-body">${safePreview}</div>
                    </div>
                    <div>
                        <div class="card-meta">
                            <span style="font-size: 12px; color: #64748b;">ID #${blog.id} • Published by You</span>
                        </div>
                        <div class="blog-actions">
                            <button type="button" class="btn edit-btn">✏️ Edit</button>
                            <button type="button" class="btn delete-btn">🗑️ Delete</button>
                        </div>
                    </div>
                `;

                // Edit Button
                const editBtn = blogCard.querySelector(".edit-btn");
                editBtn.addEventListener("click", function () {
                    window.location.href = `create-blog.html?id=${blog.id}`;
                });

                // Delete Button
                const deleteBtn = blogCard.querySelector(".delete-btn");
                deleteBtn.addEventListener("click", async function () {
                    const confirmed = confirm(`Are you sure you want to delete "${blog.title}"?`);
                    if (!confirmed) return;

                    try {
                        const deleteRes = await fetch(`${API_BASE}/blogs/${blog.id}`, {
                            method: "DELETE"
                        });
                        const deleteData = await deleteRes.json();

                        if (deleteRes.ok) {
                            alert(deleteData.message || "Article deleted successfully!");
                            loadDashboardBlogs();
                        } else {
                            alert(deleteData.message || "Failed to delete article!");
                        }
                    } catch (err) {
                        alert("Unable to delete blog. Server connection error.");
                        console.error(err);
                    }
                });

                dashboardBlogs.appendChild(blogCard);
            });
        } catch (error) {
            console.error("Dashboard Load Error:", error);
            dashboardBlogs.innerHTML = `<p style="color: #ef4444; grid-column: 1 / -1; text-align: center;">Error loading your articles. Ensure the backend server is running.</p>`;
        }
    }

    loadDashboardBlogs();
}

// --------------------------------------------------------------------------
// 9. Initialize Page Engine
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    setupNavigation();
});
setupNavigation();
