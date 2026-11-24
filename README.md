# TechSphere

TechSphere is a full-stack technology blogging website developed using HTML, CSS, JavaScript, Node.js, Express.js, and Supabase PostgreSQL.

The platform provides a complete blog publishing experience where users can register, log in, create and publish technology-related articles, manage their blog posts, and explore content published by other users.

The application uses a RESTful backend API connected to a Supabase PostgreSQL database for persistent data storage.

---

## Project Overview

TechSphere is designed to provide a modern, responsive, and user-friendly blogging platform.

- **Frontend:** Responsive user interface with homepage, category exploration, rich text editor, article reading modal, and author dashboard.
- **Backend:** Node.js and Express.js REST API for user authentication and blog management.
- **Database:** Supabase PostgreSQL for storing user and blog information.
- **Authentication:** User registration and login with password hashing using bcryptjs.

---

## Technologies Used

### Frontend

- **HTML5:** Semantic structure for web pages.
- **CSS3:** Custom styling, Flexbox, CSS Grid, and responsive media queries.
- **JavaScript (ES6+):** DOM manipulation, asynchronous Fetch API calls, rich text formatting, and frontend functionality.
- **Browser LocalStorage:** Stores client-side session information.

### Backend

- **Node.js:** JavaScript runtime environment.
- **Express.js:** Framework for building REST APIs.
- **Supabase JavaScript Client:** Connects the backend application to Supabase.
- **bcryptjs:** Used for password hashing and verification.
- **cors:** Enables cross-origin communication.
- **dotenv:** Loads environment variables from the `.env` file.

### Database

- **Supabase:** Backend database platform.
- **PostgreSQL:** Relational database used for persistent data storage.

---

## Features

### User Features

- User registration and login.
- Password hashing using bcryptjs.
- Responsive homepage.
- Explore technology-related blog posts.
- Read complete blog articles.
- Create and publish blog posts.
- Rich text editor with formatting options.
- Bold, italic, and underline formatting.
- Bullet points and numbered lists.

### Author Dashboard

- View published blog posts.
- Manage blog posts.
- Edit existing blog posts.
- Delete blog posts.

### Backend Features

- Express.js server configuration.
- RESTful API development.
- User registration API.
- User login API.
- Create blog API.
- Retrieve all blogs API.
- Retrieve a single blog by ID.
- Update existing blogs.
- Delete blogs.
- Supabase database integration.

---

## Project Structure

```text
TechSphere-GitHub-Update/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── supabase.js
│   │
│   ├── models/
│   │
│   ├── node_modules/
│   │
│   ├── .env
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

*Note: The structure above represents the main project files. Refer to the actual repository for the complete folder structure.*

---

## Database Integration – Supabase

TechSphere uses Supabase PostgreSQL instead of MongoDB Atlas.

The database contains two main tables.

### 1. Users Table

Stores registered user information.

| Column | Data Type | Description |
|---|---|---|
| id | UUID | Unique user identifier |
| name | TEXT | User name |
| email | TEXT | Unique user email |
| password | TEXT | Hashed password |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

### 2. Blogs Table

Stores published blog information.

| Column | Data Type | Description |
|---|---|---|
| id | UUID | Unique blog identifier |
| title | TEXT | Blog title |
| category | TEXT | Blog category |
| content | TEXT | Blog content |
| author | TEXT | Blog author |
| created_at | TIMESTAMPTZ | Blog creation time |
| updated_at | TIMESTAMPTZ | Last update time |

### Database Security

- Row Level Security (RLS) is enabled on both tables.
- The Supabase secret key is stored in the backend environment file.
- Database credentials are not exposed in frontend code.
- The `.env` file is excluded from Git tracking.

---

## API Endpoints

The Express.js backend runs on:

```text
http://localhost:3000
```

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check server status |
| GET | `/api` | Get API information |
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Authenticate a user |
| POST | `/api/blogs` | Create a new blog |
| GET | `/api/blogs` | Retrieve all blogs |
| GET | `/api/blogs/:id` | Retrieve a specific blog |
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
cd TechSphere-GitHub-Update
```

*Use the actual folder name created after cloning if it differs.*

### 3. Navigate to Backend

```bash
cd backend
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure Environment Variables

Create a `.env` file inside the `backend` folder.

Add the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
PORT=3000
```

Replace the placeholder values with your own Supabase project credentials.

**Important Security Notes:**

- Never share your Supabase secret key.
- Never upload the `.env` file to GitHub.
- Never use the secret key in frontend JavaScript.
- Keep all database credentials on the backend.

### 6. Start the Backend Server

```bash
node server.js
```

The backend server will start at:

```text
http://localhost:3000
```

### 7. Run the Frontend

Open `index.html` in your browser to access the TechSphere website.

Make sure the backend server is running before testing frontend features.

---

## Testing

The backend APIs and frontend integration were tested successfully.

### Backend API Testing

The following operations were tested using Thunder Client:

- User registration.
- User login.
- Create a blog.
- Retrieve all blogs.
- Retrieve a single blog.
- Update an existing blog.
- Delete a blog.

### Frontend Testing

The following features were tested through the website:

- User registration.
- User login.
- Blog creation.
- Viewing published blogs.
- Editing existing blogs.
- Deleting blog posts.

The tested operations successfully interacted with the Supabase database.

---

## Database Migration

The initial project used MongoDB Atlas for database integration.

Due to database connectivity issues, the application was migrated to Supabase PostgreSQL.

The migration involved:

- Creating a Supabase project.
- Setting up PostgreSQL tables.
- Installing the Supabase JavaScript client.
- Configuring backend environment variables.
- Updating backend database operations.
- Testing all user and blog API operations.
- Verifying frontend and backend integration.

---

## Future Improvements

- Implement token-based authentication.
- Improve user authorization and blog ownership validation.
- Add user profile management.
- Add blog search and category filtering.
- Implement pagination.
- Add image uploads for blog posts.
- Improve error handling and validation.
- Deploy the application online.

---

## Author

**Gopika A**

B.Tech Information Technology Student

---

## License

This project was developed for educational purposes.