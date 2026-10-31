# MiniSocial 🌐

A clean, modern, and responsive **Mini Social Media Web Application** built with **Django MVT (Model-View-Template)** architecture.

---

## ✨ Features

- **Authentication & User Profiles (`accounts` app)**:
  - User registration with validation, custom User model (`AbstractUser`), and login/logout.
  - Profile picture (avatar) upload with instant preview.
  - User profile customization (Display Name, Bio, Location, Profile Picture).
  - Public profile pages (`/accounts/profile/<username>/`) displaying user info, stats (Posts, Likes received, Comments), and their published posts.
  - Login supports authentication via **either username or email**.

- **Social Media Feed & Posts (`posts` app)**:
  - **Feed Timeline**: Clean card-based social timeline displaying posts in reverse chronological order.
  - **Post Composer**: Create posts with text and optional image attachments with live image upload previews.
  - **Search**: Search posts by keywords, hashtags, or author username/name.
  - **Likes & Unlikes**: Toggle post likes seamlessly. Supports both instant AJAX (no page refresh) and standard POST fallback.
  - **Comments**: Full discussion thread on each post. Add comments directly or from the post detail view.
  - **Permissions & Moderation**: Authors can delete their own posts and comments. Post authors can also moderate/delete comments on their posts.

- **Design & UX**:
  - Contemporary design inspired by modern social platforms (Plus Jakarta Sans typography, soft shadows, rounded borders).
  - Responsive layout (looks great on desktop, tablet, and mobile).
  - Fallback avatars with gradient initials when a user has not uploaded a picture.

---

## 🏗️ Project Architecture (Django MVT)

```text
minisocial/
├── config/                  # Django project configuration & settings
│   ├── settings.py          # App registry, Auth model, media/static configuration
│   ├── urls.py              # Root URL routing & media serving
│   ├── wsgi.py              # WSGI entry point
│   └── asgi.py              # ASGI entry point
├── accounts/                # User authentication & Profile management app
│   ├── models.py            # Custom User model inheriting from AbstractUser
│   ├── forms.py             # LoginForm, RegisterForm, ProfileEditForm
│   ├── views.py             # Login, register, logout, profile, and edit views
│   ├── urls.py              # Account endpoints
│   ├── admin.py             # User admin integration
│   └── tests.py             # Authentication and profile unit tests
├── posts/                   # Social posts, likes, and comments app
│   ├── models.py            # Post and Comment models with Like ManyToMany
│   ├── forms.py             # PostForm and CommentForm
│   ├── views.py             # Feed, post create, detail, delete, like toggle, comment
│   ├── urls.py              # Feed and post endpoints
│   ├── admin.py             # Post & Comment admin integration
│   ├── tests.py             # Feed, post, like, and comment tests
│   └── management/
│       └── commands/
│           └── seed_data.py # Sample demo data seeding script
├── templates/               # Django HTML templates
│   ├── base.html            # Navigation bar, flash messages, footer layout
│   ├── accounts/            # login.html, register.html, profile.html, profile_edit.html
│   └── posts/               # feed.html, post_detail.html, post_create.html, post_confirm_delete.html
├── static/                  # Static assets
│   ├── css/
│   │   └── style.css        # Modern responsive stylesheet
│   └── js/
│       └── social.js        # AJAX like button toggle, image upload preview
├── media/                   # User uploads directory (avatars and post attachments)
│   ├── avatars/
│   └── posts/
├── requirements.txt         # Project dependencies
├── .env.example             # Example environment variables
└── manage.py                # Django CLI management script
```

---

## 🚀 Quick Start Guide

### 1. Set Up Environment & Install Dependencies

From the project root directory:

```bash
# On Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt
```

*(Or if using `uv`: `uv venv` and `uv pip install -r requirements.txt`)*

### 2. Apply Database Migrations

```bash
python manage.py migrate
```

### 3. Load Sample Demo Data (Optional but Recommended)

To quickly populate demo users, posts, comments, and likes:

```bash
python manage.py seed_data
```

### 4. Run the Development Server

```bash
python manage.py runserver
```

Open your browser at **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**.

---

## 👤 Demo Accounts

Pre-seeded for testing:

| Username | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **alex** | alex@example.com | `password123` | Developer, author of posts |
| **sarah** | sarah@example.com | `password123` | Designer, active commenter |
| **marcus** | marcus@example.com | `password123` | Contributor |
| **admin** | admin@minisocial.local | `admin123` | Superuser / Admin |

You can also click **Join** to register a brand new account with your own custom profile picture, name, and bio!

---

## 🧪 Running Automated Tests

Run the test suite covering authentication, posts, comments, likes, and searches:

```bash
python manage.py test
```
