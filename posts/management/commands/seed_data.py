from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from posts.models import Post, Comment

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial demo users, posts, comments, and likes."

    def handle(self, *args, **options):
        self.stdout.write("Seeding sample data for MiniSocial...")

        # 1. Create Admin
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@minisocial.local",
                "name": "Platform Admin",
                "is_staff": True,
                "is_superuser": True,
                "bio": "Official administrator account for MiniSocial.",
                "location": "Global",
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (admin / admin123)"))

        # 2. Create Sample Users
        users_data = [
            {
                "username": "alex",
                "email": "alex@example.com",
                "name": "Alex Rivera",
                "bio": "Full-stack developer building cool web apps with Django & Python. Coffee lover ☕",
                "location": "Austin, TX",
            },
            {
                "username": "sarah",
                "email": "sarah@example.com",
                "name": "Sarah Chen",
                "bio": "Product designer & photographer. Creating intuitive digital experiences 🎨✨",
                "location": "San Francisco, CA",
            },
            {
                "username": "marcus",
                "email": "marcus@example.com",
                "name": "Marcus Vance",
                "bio": "Open source contributor, Linux enthusiast, and marathon runner 🏃‍♂️",
                "location": "London, UK",
            },
        ]

        created_users = []
        for u in users_data:
            user, u_created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "name": u["name"],
                    "bio": u["bio"],
                    "location": u["location"],
                },
            )
            if u_created:
                user.set_password("password123")
                user.save()
            created_users.append(user)

        self.stdout.write(self.style.SUCCESS(f"Created/verified {len(created_users)} demo users (password: password123)"))

        # 3. Create Sample Posts
        posts_data = [
            (
                created_users[0],  # Alex
                "🚀 Just launched our brand new MiniSocial application built with Django MVT! Clean architecture, responsive design, and smooth interactions. Let me know what you think!",
            ),
            (
                created_users[1],  # Sarah
                "Sunsets from the coast always give me the best inspiration for color palettes. What is everyone working on this weekend? 🌅🎨",
            ),
            (
                created_users[2],  # Marcus
                "Django 6's ORM and MVT pattern make building scalable social platforms surprisingly clean. Minimal boilerplate and maximum developer velocity.",
            ),
            (
                created_users[0],  # Alex
                "Tip for the day: Always keep your views focused and let your models handle data integrity. Separation of concerns is a superpower! 💡",
            ),
        ]

        sample_posts = []
        for author, content in posts_data:
            post, p_created = Post.objects.get_or_create(
                author=author,
                content=content,
            )
            sample_posts.append(post)

        self.stdout.write(self.style.SUCCESS(f"Created {len(sample_posts)} sample posts."))

        # 4. Add Likes
        sample_posts[0].likes.add(created_users[1], created_users[2])
        sample_posts[1].likes.add(created_users[0], created_users[2])
        sample_posts[2].likes.add(created_users[0])
        sample_posts[3].likes.add(created_users[1])

        # 5. Add Comments
        comments_data = [
            (sample_posts[0], created_users[1], "Looks super slick Alex! Loving the clean UI and instant like toggle."),
            (sample_posts[0], created_users[2], "Congratulations on the launch! The MVT structure is spotless."),
            (sample_posts[1], created_users[0], "Golden hour never fails! Would love to see some of the color swatches you make."),
            (sample_posts[2], created_users[1], "Totally agree Marcus, Django makes backends so robust out of the box."),
        ]

        for post, author, content in comments_data:
            Comment.objects.get_or_create(
                post=post,
                author=author,
                content=content,
            )

        self.stdout.write(self.style.SUCCESS("Sample comments and likes seeded successfully!"))
        self.stdout.write(self.style.SUCCESS("All done! You can log in as 'alex' with password 'password123'."))
