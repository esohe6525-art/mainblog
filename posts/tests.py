import json
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from .models import Post, Comment

User = get_user_model()


class PostsTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password = "Secret123!"
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            name="User One",
            password=self.password
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@example.com",
            name="User Two",
            password=self.password
        )
        self.post = Post.objects.create(
            author=self.user1,
            content="Hello MiniSocial! This is the first post."
        )

    def test_feed_view(self):
        response = self.client.get(reverse("posts:feed"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Hello MiniSocial!")
        self.assertContains(response, "@user1")

    def test_post_creation(self):
        self.client.login(username="user1", password=self.password)
        response = self.client.post(
            reverse("posts:post_create"),
            {"content": "A brand new post created via view!"},
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Post.objects.count(), 2)
        new_post = Post.objects.latest("created_at")
        self.assertEqual(new_post.author, self.user1)
        self.assertEqual(new_post.content, "A brand new post created via view!")

    def test_post_detail_view(self):
        response = self.client.get(reverse("posts:post_detail", kwargs={"pk": self.post.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Hello MiniSocial!")

    def test_like_toggle_http(self):
        self.client.login(username="user2", password=self.password)
        # 1. Like
        response = self.client.post(
            reverse("posts:like_toggle", kwargs={"pk": self.post.pk}),
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.post.like_count, 1)
        self.assertTrue(self.post.is_liked_by(self.user2))

        # 2. Unlike
        response = self.client.post(
            reverse("posts:like_toggle", kwargs={"pk": self.post.pk}),
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.post.like_count, 0)
        self.assertFalse(self.post.is_liked_by(self.user2))

    def test_like_toggle_ajax(self):
        self.client.login(username="user2", password=self.password)
        response = self.client.post(
            reverse("posts:like_toggle", kwargs={"pk": self.post.pk}),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["liked"])
        self.assertEqual(data["like_count"], 1)

    def test_comment_creation(self):
        self.client.login(username="user2", password=self.password)
        response = self.client.post(
            reverse("posts:comment_create", kwargs={"pk": self.post.pk}),
            {"content": "Awesome first post! Welcome."},
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.post.comment_count, 1)
        comment = self.post.comments.first()
        self.assertEqual(comment.author, self.user2)
        self.assertEqual(comment.content, "Awesome first post! Welcome.")

    def test_comment_deletion(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.user2,
            content="To be deleted"
        )
        self.client.login(username="user2", password=self.password)
        response = self.client.post(
            reverse("posts:comment_delete", kwargs={"pk": comment.pk}),
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Comment.objects.count(), 0)

    def test_post_deletion(self):
        self.client.login(username="user1", password=self.password)
        response = self.client.post(
            reverse("posts:post_delete", kwargs={"pk": self.post.pk}),
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Post.objects.count(), 0)

    def test_feed_search(self):
        Post.objects.create(
            author=self.user2,
            content="Exploring the mountains this weekend #hiking"
        )
        response = self.client.get(reverse("posts:feed") + "?q=mountains")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "mountains")
        self.assertNotContains(response, "Hello MiniSocial!")
