# TechSphere

TechSphere is a full-stack technology blogging website developed with a lightweight Node.js and Express.js backend and an interactive, responsive HTML, CSS, and JavaScript frontend.

The platform provides a complete blog publishing workflow where users can register an account, log in, compose formatted articles using a rich text editor, manage their posts from an author dashboard, and read technology-related blog posts.

---

## Project Overview

TechSphere is designed to provide a modern blogging experience with a clean architecture.

- **Frontend:** A responsive user interface featuring a modern hero section, category exploration, rich text formatting, an article reading modal, and a dedicated author dashboard.
- **Backend:** An Express.js REST API providing routes for user registration, login, and blog management.
- **Data Handling:** Uses in-memory data structures for prototyping and local development without requiring database configuration.

---

## Technologies Used

### Frontend

- **HTML5:** Semantic document structure across all pages.
- **CSS3:** Custom styling, Flexbox, CSS Grid, and responsive media queries.
- **JavaScript (ES6+):** DOM manipulation, asynchronous Fetch API calls, rich text formatting, modal handling, and client-side functionality.
- **Browser LocalStorage:** Stores user session details on the client side.

### Backend

- **Node.js:** JavaScript runtime environment.
- **Express.js:** Web application framework powering the REST API.
- **bcryptjs:** Library used for password hashing.
- **cors:** Middleware enabling communication between the frontend and backend.

---

## Features

### User Features

- User registration and login.
- Password hashing using bcryptjs.
- Responsive homepage.
- Explore technology blog posts.
- Read complete blog articles.
- Create and publish blog posts.
- Rich text editor with formatting options.
- Bold, italic, and underline formatting.
- Bullet points and numbered lists.

### Author Dashboard

- View published blog posts.
- Manage personal blog posts.
- Edit existing blog posts.
- Delete blog posts.

### Backend Features

- Express.js server setup.
- REST API development.
- User registration API.
- User login API.
- Create blog API.
- Retrieve all blogs API.
- Update blog API.
- Delete blog API.
- Frontend and backend integration.

---

## Project Structure

```text
TechSphere/
│
├── backend/
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── index.html
├── login.html
├── register.html
├── dashboard.html
├── create-blog.html
├── style.css
├── script.js
├── .gitignore
└── README.md
```

---

## API Endpoints

The backend server runs on `http://localhost:3000`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check server status |
| GET | `/api` | API information |
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Authenticate a user |
| POST | `/api/blogs` | Create a new blog |
| GET | `/api/blogs` | Retrieve all blogs |
| PUT | `/api/blogs/:id` | Update an existing blog |
| DELETE | `/api/blogs/:id` | Delete a blog |

---

## Installation and Setup

Follow these steps to run TechSphere locally.

### 1. Clone the Repository

```bash
git clone https://github.com/gopikaayyappan2818-design/TechSphere-.git
```

### 2. Navigate to the Project Folder

```bash
cd TechSphere-
```

### 3. Navigate to the Backend Folder

```bash
cd backend
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start the Backend Server

```bash
node server.js
```

The backend server will start at:

```text
http://localhost:3000
```

### 6. Run the Frontend

Open `index.html` in your browser to access the TechSphere website.

---

## Data Storage

The current version uses in-memory arrays to store user and blog information.

**Note:** Since the application does not yet use a database, the stored data will reset whenever the backend server restarts.

Database integration can be added in a future version.

---

## Future Improvements

- Integrate MongoDB or another database for persistent storage.
- Implement token-based authentication.
- Add user profile management.
- Add blog categories and search functionality.
- Improve authorization for blog management operations.
- Add pagination and filtering.
- Deploy the application online.

---

## Author

**Gopika A**

B.Tech Information Technology Student

---

## License

This project was developed for educational purposes.