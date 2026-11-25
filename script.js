// ==========================================================================
// TechSphere Core JavaScript Engine
// UI/UX Enhancements, Rich Text Editor, HTML Sanitizer (XSS Defense), API Sync
// ==========================================================================

const API_BASE = "http://localhost:3000/api";

// --------------------------------------------------------------------------
// 0. Authentication & JWT Session Helpers
// --------------------------------------------------------------------------

function getAuthToken() {
    const token = localStorage.getItem("techToken");
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
        return null;
    }
    return token.trim();
}

function getStoredUser() {
    try {
        const raw = localStorage.getItem("techUser");
        if (!raw || raw === "undefined" || raw === "null") {
            return null;
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
        return null;
    }
}

function getAuthHeaders(includeJsonContentType) {
    if (includeJsonContentType === undefined) includeJsonContentType = true;
    const headers = {};
    if (includeJsonContentType) {
        headers["Content-Type"] = "application/json";
    }
    const token = getAuthToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

function clearAuthSession() {
    localStorage.removeItem("techUser");
    localStorage.removeItem("techToken");
}

function handleAuthFailure(response, serverMessage) {
    if (response && response.status === 401) {
        clearAuthSession();
        alert(serverMessage || "Your session has expired. Please login again.");
        window.location.replace("login.html");
        return true;
    }
    return false;
}

function logoutUser(event) {
    if (event) event.preventDefault();
    clearAuthSession();
    alert("You have been logged out successfully!");
    window.location.replace("login.html");
}

function getInitials(name) {
    if (!name || typeof name !== "string") return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function updateBookmarkCount() {
    const bookmarkCountEl = document.getElementById("userBookmarkCount");
    if (bookmarkCountEl) {
        bookmarkCountEl.textContent = getBookmarks().length;
    }
}

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

let navigationInitialized = false;

function setupNavigation() {
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu") || document.querySelector("nav");

    // Dynamic Navigation Bar links based on logged-in state
    const user = getStoredUser();
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

        // Close mobile/tablet menu whenever any navigation link is clicked
        navMenu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navMenu.classList.remove("active");
                if (menuToggle) {
                    menuToggle.setAttribute("aria-expanded", "false");
                }
            });
        });

        // Attach Logout Event
        const logoutBtn = document.getElementById("logout");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", logoutUser);
        }
    }

    // Bind toggle listener only once to prevent double-toggle bug
    if (menuToggle && navMenu && !navigationInitialized) {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            const isOpen = navMenu.classList.toggle("active");
            menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        // Close menu when clicking outside header
        document.addEventListener("click", function (event) {
            if (navMenu.classList.contains("active") && !navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                navMenu.classList.remove("active");
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });

        navigationInitialized = true;
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
                if (!data.token || !data.user) {
                    clearAuthSession();
                    alert("Login failed: Server did not return an authentication token. Please restart the backend server and try again.");
                    return;
                }
                localStorage.setItem("techUser", JSON.stringify(data.user));
                localStorage.setItem("techToken", data.token);
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
                if (data.token) {
                    localStorage.setItem("techToken", data.token);
                }
                if (data.user) {
                    localStorage.setItem("techUser", JSON.stringify(data.user));
                }
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
// 5.1 Forgot Password & Reset Password Handlers
// --------------------------------------------------------------------------

function showStatusMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    if (isError) {
        el.style.background = "#fef2f2";
        el.style.color = "#b91c1c";
        el.style.border = "1px solid #fecaca";
    } else {
        el.style.background = "#ecfdf5";
        el.style.color = "#065f46";
        el.style.border = "1px solid #a7f3d0";
    }
}

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const emailInput = document.getElementById("forgotEmail");
        const messageEl = document.getElementById("forgotMessage");
        const submitBtn = document.getElementById("sendResetBtn");
        const email = emailInput ? emailInput.value.trim() : "";

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showStatusMessage(messageEl, "Please enter a valid email address.", true);
            if (emailInput) emailInput.focus();
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
        }

        try {
            const response = await fetch(`${API_BASE}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            let data = {};
            try {
                data = await response.json();
            } catch (_) {
                data = {};
            }

            if (response.ok) {
                showStatusMessage(
                    messageEl,
                    data.message || "If an account with that email exists, a password reset link has been sent.",
                    false
                );
                forgotPasswordForm.reset();
            } else if (response.status === 404) {
                showStatusMessage(
                    messageEl,
                    data.message || "Forgot password endpoint not found (404). Please restart the backend server.",
                    true
                );
            } else {
                showStatusMessage(messageEl, data.message || "Unable to send reset link.", true);
            }
        } catch (error) {
            console.error("Forgot Password Error:", error);
            showStatusMessage(messageEl, "Unable to connect to backend server!", true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Send Reset Link";
            }
        }
    });
}

const resetPasswordForm = document.getElementById("resetPasswordForm");
if (resetPasswordForm) {
    const tokenStatusEl = document.getElementById("resetTokenStatus");
    const resetMessageEl = document.getElementById("resetMessage");
    const resetSubmitBtn = document.getElementById("resetSubmitBtn");
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = (urlParams.get("token") || "").trim();

    (async function verifyTokenOnLoad() {
        if (!resetToken) {
            if (tokenStatusEl) tokenStatusEl.style.display = "none";
            showStatusMessage(resetMessageEl, "Missing reset token. Please request a new password reset link.", true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/verify-reset-token?token=${encodeURIComponent(resetToken)}`);
            let data = {};
            try {
                data = await response.json();
            } catch (_) {
                data = {};
            }

            if (response.ok && data.valid) {
                if (tokenStatusEl) tokenStatusEl.style.display = "none";
                resetPasswordForm.style.display = "flex";
            } else {
                if (tokenStatusEl) tokenStatusEl.style.display = "none";
                showStatusMessage(resetMessageEl, data.message || "Invalid or expired reset link. Please request a new one.", true);
            }
        } catch (error) {
            console.error("Verify Reset Token Error:", error);
            if (tokenStatusEl) tokenStatusEl.style.display = "none";
            showStatusMessage(resetMessageEl, "Unable to verify reset link. Ensure the backend server is running.", true);
        }
    })();

    resetPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword = document.getElementById("confirmNewPassword").value;

        if (!newPassword || newPassword.length < 6) {
            showStatusMessage(resetMessageEl, "Password must be at least 6 characters long.", true);
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showStatusMessage(resetMessageEl, "Passwords do not match!", true);
            return;
        }

        if (resetSubmitBtn) {
            resetSubmitBtn.disabled = true;
            resetSubmitBtn.textContent = "Resetting...";
        }

        try {
            const response = await fetch(`${API_BASE}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: resetToken, newPassword })
            });
            let data = {};
            try {
                data = await response.json();
            } catch (_) {
                data = {};
            }

            if (response.ok) {
                resetPasswordForm.style.display = "none";
                showStatusMessage(resetMessageEl, data.message || "Password reset successful! Redirecting to login...", false);
                setTimeout(function () {
                    window.location.href = "login.html";
                }, 2000);
            } else {
                showStatusMessage(resetMessageEl, data.message || "Failed to reset password.", true);
            }
        } catch (error) {
            console.error("Reset Password Error:", error);
            showStatusMessage(resetMessageEl, "Unable to connect to backend server!", true);
        } finally {
            if (resetSubmitBtn) {
                resetSubmitBtn.disabled = false;
                resetSubmitBtn.textContent = "Reset Password";
            }
        }
    });
}

// --------------------------------------------------------------------------
// 6. Rich Text Blog Editor: Create & Update
// --------------------------------------------------------------------------

const blogForm = document.getElementById("blogForm");
if (blogForm) {
    // Auth Guard: Require login & JWT token
    const user = getStoredUser();
    if (!user || !getAuthToken()) {
        clearAuthSession();
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

        const currentUser = getStoredUser();
        if (!currentUser || !getAuthToken()) {
            clearAuthSession();
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
                content: sanitizedContent
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
                headers: getAuthHeaders(true),
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (handleAuthFailure(response, data.message)) return;

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
// 7. Community Published Blogs + Featured + Trending + Search/Filter/Sort
// --------------------------------------------------------------------------

// ---- Bookmark Utilities (localStorage) ----
function getBookmarks() {
    try { return JSON.parse(localStorage.getItem("techBookmarks") || "[]"); }
    catch (e) { return []; }
}
function isBookmarked(id) { return getBookmarks().includes(String(id)); }
function toggleBookmark(id) {
    let bmarks = getBookmarks();
    const sid = String(id);
    if (bmarks.includes(sid)) {
        bmarks = bmarks.filter(function(b) { return b !== sid; });
    } else {
        bmarks.push(sid);
    }
    localStorage.setItem("techBookmarks", JSON.stringify(bmarks));
}

// ---- Shared Blog Card Factory ----
function createBlogCard(blog, isFeatured, isTrending) {
    isFeatured = isFeatured || false;
    isTrending = isTrending || false;

    var card = document.createElement("div");
    card.className = "blog-card";
    card.style.position = "relative";

    var safeCategory = escapeHTML(blog.category || "General");
    var safeTitle = escapeHTML(blog.title || "Untitled");
    var safeAuthor = escapeHTML(blog.author || "Tech Enthusiast");
    var safePreview = sanitizeHTML(blog.content || "");
    var authorInitial = safeAuthor.charAt(0).toUpperCase();
    // FIX Bug 7: Always coerce blogId to String for consistent comparison
    var blogId = String(blog.id || blog._id || "");
    var bookmarked = isBookmarked(blogId);

    var badge = "";
    if (isFeatured) {
        badge = '<span class="featured-badge">⭐ Featured</span>';
    } else if (isTrending) {
        badge = '<span class="trending-badge">🔥 Trending</span>';
    }

    // FIX Bug 2: Show clear visual text so user always knows bookmark state
    var bmLabel = bookmarked ? "✅ Saved" : "🔖 Save";
    var bmTitle = bookmarked ? "Remove Bookmark" : "Bookmark this article";
    var bmClass = bookmarked ? "btn bookmark-btn bookmarked" : "btn bookmark-btn";

    card.innerHTML = badge + '\
        <div>\
            <span class="card-tag">' + safeCategory + '</span>\
            <h3>' + safeTitle + '</h3>\
            <div class="blog-content-body">' + safePreview + '</div>\
        </div>\
        <div>\
            <div class="card-meta">\
                <div class="author-badge">' + authorInitial + '</div>\
                <span>By ' + safeAuthor + '</span>\
            </div>\
            <div style="display:flex; gap:8px; margin-top:15px;">\
                <button type="button" class="btn btn-outline read-btn" style="flex:1;">Read Full Article</button>\
                <button type="button" class="' + bmClass + '" title="' + bmTitle + '" style="padding:8px 14px; font-size:14px; white-space:nowrap;">' + bmLabel + '</button>\
            </div>\
        </div>';

    // FIX Bug 8: Listener is attached directly on the DOM node — always works for dynamic cards
    card.querySelector(".read-btn").addEventListener("click", function() {
        window.location.href = "blog.html?id=" + encodeURIComponent(blogId);
    });

    card.querySelector(".bookmark-btn").addEventListener("click", function() {
        // FIX Bug 3: Use same String(id) as stored to guarantee consistent lookup
        toggleBookmark(blogId);
        var nowSaved = isBookmarked(blogId);
        this.textContent = nowSaved ? "✅ Saved" : "🔖 Save";
        this.title = nowSaved ? "Remove Bookmark" : "Bookmark this article";
        if (nowSaved) {
            this.classList.add("bookmarked");
        } else {
            this.classList.remove("bookmarked");
        }
    });

    return card;
}

// ---- Module 4 State Engine ----
var allBlogsData = [];
var currentSearch = "";
var currentCategory = "all";
var currentSort = "newest";

var publishedBlogsEl = document.getElementById("publishedBlogs");
var featuredBlogsEl = document.getElementById("featuredBlogs");
var trendingBlogsEl = document.getElementById("trendingBlogs");

if (publishedBlogsEl || featuredBlogsEl || trendingBlogsEl) {

    function renderFeaturedBlogs() {
        if (!featuredBlogsEl || allBlogsData.length === 0) return;
        var featured = allBlogsData.slice().sort(function(a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }).slice(0, 3);
        featuredBlogsEl.innerHTML = "";
        featured.forEach(function(blog) {
            featuredBlogsEl.appendChild(createBlogCard(blog, true, false));
        });
    }

    function renderTrendingBlogs() {
        if (!trendingBlogsEl || allBlogsData.length === 0) return;
        var now = Date.now();
        var scored = allBlogsData.map(function(blog) {
            var contentLen = (blog.content || "").replace(/<[^>]*>/g, "").length;
            var daysOld = (now - new Date(blog.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            var recencyBonus = Math.max(0, 30 - daysOld);
            return { blog: blog, score: (contentLen / 100) + recencyBonus };
        });
        scored.sort(function(a, b) { return b.score - a.score; });
        var top4 = scored.slice(0, 4);
        trendingBlogsEl.innerHTML = "";
        top4.forEach(function(item) {
            trendingBlogsEl.appendChild(createBlogCard(item.blog, false, true));
        });
    }

    function renderCommunityBlogs() {
        if (!publishedBlogsEl) return;
        var query = currentSearch.toLowerCase();
        var filtered = allBlogsData.filter(function(blog) {
            var matchSearch = !query ||
                (blog.title || "").toLowerCase().indexOf(query) !== -1 ||
                (blog.author || "").toLowerCase().indexOf(query) !== -1 ||
                (blog.category || "").toLowerCase().indexOf(query) !== -1 ||
                (blog.content || "").toLowerCase().indexOf(query) !== -1;
            var matchCategory = currentCategory === "all" ||
                (blog.category || "") === currentCategory;
            return matchSearch && matchCategory;
        });

        if (currentSort === "newest") {
            filtered.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        } else if (currentSort === "oldest") {
            filtered.sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        } else if (currentSort === "az") {
            filtered.sort(function(a, b) { return (a.title || "").localeCompare(b.title || ""); });
        } else if (currentSort === "za") {
            filtered.sort(function(a, b) { return (b.title || "").localeCompare(a.title || ""); });
        }

        var noResults = document.getElementById("noResultsMessage");
        publishedBlogsEl.innerHTML = "";

        if (filtered.length === 0) {
            if (noResults) noResults.style.display = "block";
            return;
        }
        if (noResults) noResults.style.display = "none";

        filtered.forEach(function(blog) {
            publishedBlogsEl.appendChild(createBlogCard(blog, false, false));
        });
    }

    async function loadAllBlogs() {
        try {
            var response = await fetch(API_BASE + "/blogs");
            var data = await response.json();
            allBlogsData = data.blogs || [];

            if (allBlogsData.length === 0) {
                if (publishedBlogsEl) {
                    publishedBlogsEl.innerHTML = '\
                        <div style="grid-column:1/-1;text-align:center;padding:40px;background:white;border-radius:12px;border:1px dashed #cbd5e1;">\
                            <p style="color:#64748b;font-size:16px;margin-bottom:15px;">No community articles published yet. Be the first to share your insights!</p>\
                            <a href="create-blog.html" class="btn btn-primary">\u270d\ufe0f Write First Article</a>\
                        </div>';
                }
                return;
            }

            renderFeaturedBlogs();
            renderTrendingBlogs();
            renderCommunityBlogs();
        } catch (error) {
            console.error("Error loading blogs:", error);
            if (publishedBlogsEl) {
                publishedBlogsEl.innerHTML = '<p style="color:#ef4444;grid-column:1/-1;text-align:center;">Unable to load blogs. Please verify backend server is running.</p>';
            }
        }
    }

    // Wire up filter controls after DOM ready
    document.addEventListener("DOMContentLoaded", function() {
        var searchInput = document.getElementById("searchInput");
        var clearBtn = document.getElementById("clearSearchBtn");
        var categoryFilter = document.getElementById("categoryFilter");
        var sortSelect = document.getElementById("sortSelect");
        var resetBtn = document.getElementById("resetFiltersBtn");

        if (searchInput) {
            searchInput.addEventListener("input", function() {
                currentSearch = this.value.trim();
                if (clearBtn) clearBtn.style.display = currentSearch ? "inline-flex" : "none";
                renderCommunityBlogs();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener("click", function() {
                if (searchInput) searchInput.value = "";
                currentSearch = "";
                clearBtn.style.display = "none";
                renderCommunityBlogs();
            });
        }
        if (categoryFilter) {
            categoryFilter.addEventListener("change", function() {
                currentCategory = this.value;
                renderCommunityBlogs();
            });
        }
        if (sortSelect) {
            sortSelect.addEventListener("change", function() {
                currentSort = this.value;
                renderCommunityBlogs();
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener("click", function() {
                if (searchInput) searchInput.value = "";
                if (categoryFilter) categoryFilter.value = "all";
                if (sortSelect) sortSelect.value = "newest";
                currentSearch = "";
                currentCategory = "all";
                currentSort = "newest";
                if (clearBtn) clearBtn.style.display = "none";
                renderCommunityBlogs();
            });
        }
    });

    loadAllBlogs();
}

// --------------------------------------------------------------------------
// 7.1 Single Blog Details Loader (blog.html)
// --------------------------------------------------------------------------

const blogDetailContainer = document.getElementById("blogDetailContainer");
if (blogDetailContainer) {
    async function loadSingleBlog() {
        const loadingEl = document.getElementById("blogLoading");
        const notFoundEl = document.getElementById("blogNotFound");
        const articleEl = document.getElementById("blogArticle");
        const notFoundMsg = document.getElementById("blogNotFoundMsg");

        // 4. In blog.html, extract the ID using URLSearchParams
        const urlParams = new URLSearchParams(window.location.search);
        const blogId = urlParams.get("id");

        if (!blogId || blogId.trim() === "") {
            if (loadingEl) loadingEl.style.display = "none";
            if (notFoundEl) notFoundEl.style.display = "block";
            if (notFoundMsg) notFoundMsg.textContent = "No article ID was specified in the URL.";
            return;
        }

        try {
            // 5. Fetch individual blog using GET http://localhost:3000/api/blogs/:id
            const response = await fetch(`${API_BASE}/blogs/${encodeURIComponent(blogId.trim())}`);
            const data = await response.json();

            if (loadingEl) loadingEl.style.display = "none";

            if (!response.ok || !data.blog) {
                if (notFoundEl) notFoundEl.style.display = "block";
                if (notFoundMsg) notFoundMsg.textContent = data.message || "The requested article could not be found.";
                return;
            }

            const blog = data.blog;
            const safeCategory = escapeHTML(blog.category || "General");
            const safeAuthor = escapeHTML(blog.author || "Tech Enthusiast");

            // Format Published Date
            let formattedDate = "Recently published";
            if (blog.createdAt) {
                const dateObj = new Date(blog.createdAt);
                if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    });
                }
            }

            // 6. Display blog's Title, Category, Full content, Author, Published date
            const titleEl = document.getElementById("blogTitle");
            const categoryEl = document.getElementById("blogCategory");
            const authorEl = document.getElementById("blogAuthor");
            const authorBadgeEl = document.getElementById("blogAuthorBadge");
            const dateEl = document.getElementById("blogDate");
            const contentEl = document.getElementById("blogContent");

            if (titleEl) titleEl.textContent = blog.title;
            if (categoryEl) categoryEl.textContent = safeCategory;
            if (authorEl) authorEl.textContent = safeAuthor;
            if (authorBadgeEl) authorBadgeEl.textContent = safeAuthor.charAt(0).toUpperCase();
            if (dateEl) dateEl.textContent = formattedDate;

            // Sanitize rich formatted content
            if (contentEl) {
                contentEl.innerHTML = sanitizeHTML(blog.content);
            }

            // Update document title
            document.title = `${blog.title} - TechSphere`;

            if (articleEl) articleEl.style.display = "block";

            // Wire up bookmark button on blog.html
            var bookmarkBtn = document.getElementById("bookmarkBlogBtn");
            if (bookmarkBtn) {
                var currentId = String(blog.id || blog._id || "");
                if (isBookmarked(currentId)) {
                    bookmarkBtn.textContent = "🔖 Bookmarked";
                    bookmarkBtn.classList.add("bookmarked");
                }
                bookmarkBtn.addEventListener("click", function() {
                    toggleBookmark(currentId);
                    if (isBookmarked(currentId)) {
                        this.textContent = "🔖 Bookmarked";
                        this.classList.add("bookmarked");
                    } else {
                        this.textContent = "🔖 Bookmark Article";
                        this.classList.remove("bookmarked");
                    }
                });
            }

        } catch (error) {
            console.error("Error loading blog details:", error);
            if (loadingEl) loadingEl.style.display = "none";
            if (notFoundEl) notFoundEl.style.display = "block";
            if (notFoundMsg) notFoundMsg.textContent = "Unable to connect to backend server. Please verify the server is running.";
        }
    }

    loadSingleBlog();
}

// --------------------------------------------------------------------------
// 8. Creator Dashboard: User Blogs Management
// --------------------------------------------------------------------------

const dashboardBlogs = document.getElementById("dashboardBlogs");
if (dashboardBlogs) {
    // Prevent bfcache from exposing protected dashboard data after logout
    window.addEventListener("pageshow", function () {
        if (!getStoredUser() || !getAuthToken()) {
            clearAuthSession();
            window.location.replace("login.html");
        }
    });

    const dashboardLogoutBtn = document.getElementById("dashboardLogoutBtn");
    if (dashboardLogoutBtn) {
        dashboardLogoutBtn.addEventListener("click", logoutUser);
    }

    function renderUserProfile(user) {
        if (!user) return;
        const welcomeMessage = document.getElementById("welcomeMessage");
        const profileNameEl = document.getElementById("profileName");
        const profileEmailEl = document.getElementById("profileEmail");
        const profileAvatarEl = document.getElementById("profileAvatar");

        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user.name}!`;
        }
        if (profileNameEl) {
            profileNameEl.textContent = user.name || "TechSphere User";
        }
        if (profileEmailEl) {
            profileEmailEl.textContent = user.email || "";
        }
        if (profileAvatarEl) {
            profileAvatarEl.textContent = getInitials(user.name);
        }
    }

    async function loadUserProfile() {
        try {
            const response = await fetch(`${API_BASE}/profile`, {
                headers: getAuthHeaders(false)
            });
            const data = await response.json();
            if (handleAuthFailure(response, data.message)) return null;

            if (response.ok && data.user) {
                localStorage.setItem("techUser", JSON.stringify(data.user));
                renderUserProfile(data.user);
                return data.user;
            }
        } catch (err) {
            console.error("Profile Load Error:", err);
        }
        return null;
    }

    async function loadDashboardBlogs() {
        const user = getStoredUser();

        if (!user || !getAuthToken()) {
            clearAuthSession();
            alert("Please login first to view your dashboard!");
            window.location.replace("login.html");
            return;
        }

        renderUserProfile(user);
        updateBookmarkCount();

        await loadUserProfile();

        try {
            const response = await fetch(`${API_BASE}/my-blogs`, {
                headers: getAuthHeaders(false)
            });
            const data = await response.json();

            if (handleAuthFailure(response, data.message)) return;

            dashboardBlogs.innerHTML = "";

            const myBlogs = data.blogs || [];

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
                            method: "DELETE",
                            headers: getAuthHeaders(false)
                        });
                        const deleteData = await deleteRes.json();

                        if (handleAuthFailure(deleteRes, deleteData.message)) return;

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
// 8.1 Saved Blogs Loader (dashboard.html)
// FIX Bug 1: loadSavedBlogs is a TRUE GLOBAL function — not wrapped in any
// if() block — so switchTab() in dashboard.html can always call it safely.
// --------------------------------------------------------------------------

function loadSavedBlogs() {
    // Safe guard: only run if the #savedBlogs container is in this page
    var savedBlogsEl = document.getElementById("savedBlogs");
    if (!savedBlogsEl) return;

    var bookmarkIds = getBookmarks();
    savedBlogsEl.innerHTML = "";

    if (bookmarkIds.length === 0) {
        savedBlogsEl.innerHTML = '\
            <div style="grid-column:1/-1;text-align:center;padding:50px 20px;background:white;border-radius:14px;border:1.5px dashed #cbd5e1;">\
                <h3 style="font-size:20px;color:#0f172a;margin-bottom:8px;">No saved articles yet</h3>\
                <p style="color:#64748b;font-size:15px;margin-bottom:20px;">Bookmark articles from the homepage to read them later.</p>\
                <a href="index.html" class="btn btn-primary">🔖 Browse Articles</a>\
            </div>';
        return;
    }

    // Show a loading state while fetching
    savedBlogsEl.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:30px;">Loading your saved articles...</p>';

    var fetched = [];
    var remaining = bookmarkIds.length;

    bookmarkIds.forEach(function(id) {
        fetch(API_BASE + "/blogs/" + encodeURIComponent(String(id)))
            .then(function(res) { return res.json(); })
            .then(function(data) {
                remaining--;
                if (data.blog) {
                    fetched.push(data.blog);
                }
                // Only render once ALL requests have resolved (success or error)
                if (remaining === 0) {
                    renderSavedCards(savedBlogsEl, fetched);
                }
            })
            .catch(function(err) {
                remaining--;
                console.error("Error loading saved blog " + id + ":", err);
                if (remaining === 0) {
                    renderSavedCards(savedBlogsEl, fetched);
                }
            });
    });
}

function renderSavedCards(container, blogs) {
    container.innerHTML = "";

    if (blogs.length === 0) {
        container.innerHTML = '\
            <div style="grid-column:1/-1;text-align:center;padding:50px 20px;background:white;border-radius:14px;border:1.5px dashed #cbd5e1;">\
                <h3 style="font-size:20px;color:#0f172a;margin-bottom:8px;">Could not load saved articles</h3>\
                <p style="color:#64748b;font-size:15px;margin-bottom:20px;">Make sure the backend server is running and try again.</p>\
                <a href="index.html" class="btn btn-outline">← Back to Home</a>\
            </div>';
        return;
    }

    blogs.forEach(function(blog) {
        var card = document.createElement("div");
        card.className = "blog-card";
        card.style.position = "relative";

        var safeCategory = escapeHTML(blog.category || "General");
        var safeTitle = escapeHTML(blog.title || "Untitled");
        var safeAuthor = escapeHTML(blog.author || "Tech Enthusiast");
        var safePreview = sanitizeHTML(blog.content || "");
        var authorInitial = safeAuthor.charAt(0).toUpperCase();
        // FIX: Always String() for consistent ID comparison
        var blogId = String(blog.id || blog._id || "");

        card.innerHTML = '\
            <span class="featured-badge" style="background:linear-gradient(135deg,#f59e0b,#d97706);">🔖 Saved</span>\
            <div>\
                <span class="card-tag">' + safeCategory + '</span>\
                <h3>' + safeTitle + '</h3>\
                <div class="blog-content-body">' + safePreview + '</div>\
            </div>\
            <div>\
                <div class="card-meta">\
                    <div class="author-badge">' + authorInitial + '</div>\
                    <span>By ' + safeAuthor + '</span>\
                </div>\
                <div style="display:flex;gap:8px;margin-top:15px;">\
                    <button type="button" class="btn btn-outline read-btn" style="flex:1;">Read Article</button>\
                    <button type="button" class="btn btn-outline remove-bookmark-btn" style="padding:10px 14px;color:#ef4444;border-color:#ef4444;font-size:13px;white-space:nowrap;" title="Remove Bookmark">🗑️ Unsave</button>\
                </div>\
            </div>';

        card.querySelector(".read-btn").addEventListener("click", function() {
            window.location.href = "blog.html?id=" + encodeURIComponent(blogId);
        });

        // FIX: Unsave button removes from localStorage then re-renders
        card.querySelector(".remove-bookmark-btn").addEventListener("click", function() {
            toggleBookmark(blogId);
            updateBookmarkCount();
            card.style.opacity = "0.4";
            card.style.transition = "opacity 0.3s";
            setTimeout(function() {
                card.remove();
                // If container is now visually empty, reload to show empty state
                var remaining = container.querySelectorAll(".blog-card").length;
                if (remaining === 0) {
                    loadSavedBlogs();
                }
            }, 300);
        });

        container.appendChild(card);
    });
}

// --------------------------------------------------------------------------
// 9. Initialize Page Engine
// --------------------------------------------------------------------------
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNavigation);
} else {
    setupNavigation();
}
