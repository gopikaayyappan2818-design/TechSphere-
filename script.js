// Explore Blogs Button
// Explore Blogs Button
const exploreButton = document.querySelector(".hero button");

if (exploreButton) {

    exploreButton.addEventListener("click", function() {

        document.getElementById("blogs").scrollIntoView({
            behavior: "smooth"
        });

    });

}

// Read More Buttons
// Read More Buttons
const readButtons = document.querySelectorAll(".blog-card button");

readButtons.forEach(function(button) {

    button.addEventListener("click", function() {

        const blogTitle = this.parentElement.querySelector("h3").textContent;

        alert("You selected: " + blogTitle);

    });

});
// Login Form

// Login Authentication

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const savedUser = JSON.parse(localStorage.getItem("techUser"));

        if (!savedUser) {
            alert("Please register first!");
            return;
        }

        if (email === savedUser.email && password === savedUser.password) {

            alert("Login Successful! Welcome " + savedUser.name);

            window.location.href = "dashboard.html";

        } else {

            alert("Invalid Email or Password!");

        }

    });

}

// Registration Functionality

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("regEmail").value;
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        const user = {
            name: name,
            email: email,
            password: password
        };

        localStorage.setItem("techUser", JSON.stringify(user));

        alert("Registration Successful!");

        window.location.href = "login.html";

    });

}

// Dashboard Welcome Message

const welcomeMessage = document.getElementById("welcomeMessage");

if (welcomeMessage) {

    const user = JSON.parse(localStorage.getItem("techUser"));

    if (user) {
        welcomeMessage.textContent = "Welcome, " + user.name + "!";
    } else {
        alert("Please login first!");
        window.location.href = "login.html";
    }

}


// Logout Functionality

const logoutButton = document.getElementById("logout");

if (logoutButton) {

    logoutButton.addEventListener("click", function() {

        window.location.href = "login.html";

    });

}

// Create Blog Functionality

const blogForm = document.getElementById("blogForm");

if (blogForm) {

    blogForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const title = document.getElementById("blogTitle").value;
        const category = document.getElementById("category").value;
        const content = document.getElementById("blogContent").value;

        const blog = {
            title: title,
            category: category,
            content: content
        };

        let blogs = JSON.parse(localStorage.getItem("techBlogs")) || [];

        blogs.push(blog);

        localStorage.setItem("techBlogs", JSON.stringify(blogs));

        alert("Blog Published Successfully!");

        window.location.href = "index.html";

    });

}
// Display Published Blogs

const publishedBlogs = document.getElementById("publishedBlogs");

if (publishedBlogs) {

    const blogs = JSON.parse(localStorage.getItem("techBlogs")) || [];

    blogs.forEach(function(blog) {

        const blogCard = document.createElement("div");

        blogCard.className = "blog-card";

        const title = document.createElement("h3");
        title.textContent = blog.title;

        const category = document.createElement("p");
        category.textContent = "Category: " + blog.category;

        const content = document.createElement("p");
        content.textContent = blog.content;

        blogCard.appendChild(title);
        blogCard.appendChild(category);
        blogCard.appendChild(content);

        publishedBlogs.appendChild(blogCard);

    });

}

