# MiniSocial 🌐

A clean, modern, and responsive **Mini Social Media Web Application** built with Python and the **Django MVT (Model-View-Template)** architecture.

---

## 📖 Overview

MiniSocial is a full-featured social platform where users can register/log in, upload custom profile pictures, publish posts with text and images, leave comments on discussions, and like/unlike posts in real time.

---

## ✨ Features

### 👤 1. Authentication & Profiles (`accounts` app)
- **Custom User Model**: Extends Django's `AbstractUser` with fields for `avatar`, `name`, `bio`, and `location`.
- **Profile Picture Upload**: Upload custom avatars during signup or from the profile edit page, complete with live image preview and gradient fallback initials.
- **Dual Login Support**: Sign in using **either** username or email address.
- **Public & Personal Profiles**: View user bio, location, join date, statistics (total posts, total likes received, total comments), and an author timeline.

### 📝 2. Posts & Feeds (`posts` app)
- **Timeline Feed**: Clean card stream displaying posts in reverse-chronological order.
- **Post Composer**: In-feed composer and standalone page supporting text and image attachments with preview.
- **Search & Filter**: Search posts across content keywords, hashtags, and author handles.
- **Post Management**: Post authors have full permission to delete their own posts.

### ❤️ 3. Likes & Engagement
- **Dynamic Likes**: Instant like/unlike toggle using asynchronous `fetch` (AJAX) so the page never reloads, with automatic fallback for standard HTTP POST requests.
- **Live Counter**: Heart icon animation and dynamic like counter updates.

### 💬 4. Comment Threads
- **Interactive Comments**: Place replies directly from the feed or join discussions on the dedicated post detail page.
- **Comment Moderation**: Comment authors can delete their comments, and post authors can moderate replies under their posts.

### 🎨 5. Modern UI & Responsive Design
- Modern aesthetic inspired by top social platforms (Plus Jakarta Sans typography, card-based stream, soft shadows).
- Fully responsive across mobile, tablet, and desktop screens.

---

## 🏗️ Project Architecture (Django MVT)

```text
minisocial/
├── manage.py                        # Django CLI utility
├── requirements.txt                 # Project dependencies
├── .env.example                     # Environment configuration template
│
├── config/                          # Project configuration root
│   ├── settings.py                  # Custom user model, static & media settings
│   ├── urls.py                      # Main URL router with media serving
│   ├── wsgi.py                      # WSGI server entry
│   └── asgi.py                      # ASGI server entry
│
├── accounts/                        # Authentication & User Profiles
│   ├── models.py                    # Custom User model (AbstractUser)
│   ├── forms.py                     # LoginForm, RegisterForm, ProfileEditForm
│   ├── views.py                     # Register, Login, Logout, Profile, Edit views
│   ├── urls.py                      # /accounts/ routes
│   ├── admin.py                     # Django Admin registration
│   └── tests.py                     # Auth & profile unit tests
│
├── posts/                           # Core Social Functionality
│   ├── models.py                    # Post & Comment models (M2M Likes)
│   ├── forms.py                     # PostForm & CommentForm
│   ├── views.py                     # Feed, Post Detail, Like Toggle, Comments
│   ├── urls.py                      # Feed & post routes
│   ├── admin.py                     # Admin registration with inlines
│   ├── tests.py                     # Social interaction unit tests
│   └── management/
│       └── commands/
│           └── seed_data.py         # Demo data generator
│
├── templates/                       # HTML Templates (MVT - Template Layer)
│   ├── base.html                    # Layout shell, navbar, alerts, footer
│   ├── accounts/
│   │   ├── login.html               # Sign-in form
│   │   ├── register.html            # Registration with avatar upload
│   │   ├── profile.html             # Profile banner, stats & posts
│   │   └── profile_edit.html        # Profile settings form
│   └── posts/
│       ├── feed.html                # Main feed, composer, sidebars
│       ├── post_detail.html         # Post thread & comments
│       ├── post_create.html         # Standalone composer
│       └── post_confirm_delete.html # Deletion confirmation modal
│
├── static/                          # Static Assets
│   ├── css/
│   │   └── style.css                # CSS variables, card styles, responsiveness
│   └── js/
│       └── social.js                # AJAX like toggle & upload image preview
│
└── media/                           # User-Uploaded Files
    ├── avatars/                     # Uploaded user profile pictures
    └── posts/                       # Uploaded post image attachments


🔑 Demo Accounts

Pre-seeded credentials for immediate testing:

Username	Email	                  Password	        Role
alex	    alex@example.com	      password123	      Developer with published posts
sarah	    sarah@example.com	      password123	      Designer with comments and likes
marcus	  marcus@example.com	    password123	      Community contributor
admin	    admin@minisocial.local	admin123	        Superuser / Django Admin

Admin panel available at: http://127.0.0.1:8000/admin/

🗺️ URL Routing Reference
Endpoint	Name	Description
/	posts:feed	Main social feed & inline composer
/new/	posts:post_create	Dedicated post creation page
/<int:pk>/	posts:post_detail	Detailed post view with comments
/<int:pk>/like/	posts:like_toggle	Toggle like/unlike (AJAX or POST)
/<int:pk>/comment/	posts:comment_create	Add a comment to a post
/<int:pk>/delete/	posts:post_delete	Delete a post (author only)
/comment/<int:pk>/delete/	posts:comment_delete	Delete a comment
/accounts/register/	accounts:register	User signup with profile picture
/accounts/login/	accounts:login	Sign-in (username or email)
/accounts/logout/	accounts:logout	Sign-out
/accounts/profile/	accounts:my_profile	Current user profile
/accounts/profile/<username>/	accounts:profile	Public user profile
/accounts/profile/edit/	accounts:profile_edit	Edit bio, name, location, avatar
