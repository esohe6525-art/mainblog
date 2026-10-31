from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150, blank=True, verbose_name="Full Name")
    bio = models.TextField(max_length=300, blank=True, verbose_name="Bio")
    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="Profile Picture",
    )
    location = models.CharField(max_length=100, blank=True, verbose_name="Location")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"@{self.username}"

    @property
    def display_name(self):
        return self.name.strip() if self.name and self.name.strip() else self.username

    @property
    def avatar_url(self):
        if self.avatar and hasattr(self.avatar, "url"):
            return self.avatar.url
        return None

    @property
    def posts_count(self):
        return self.posts.count()

    @property
    def likes_received_count(self):
        return sum(post.likes.count() for post in self.posts.all())
