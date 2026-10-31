from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


class AccountsTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user_password = "SecurePassword123!"
        self.user = User.objects.create_user(
            username="johndoe",
            email="john@example.com",
            name="John Doe",
            password=self.user_password,
            bio="Software engineer & tech enthusiast",
            location="San Francisco, CA"
        )

    def test_user_creation_and_properties(self):
        self.assertEqual(self.user.username, "johndoe")
        self.assertEqual(self.user.display_name, "John Doe")
        self.assertEqual(str(self.user), "@johndoe")

    def test_user_login_with_username(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"login_identifier": "johndoe", "password": self.user_password},
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["user"].is_authenticated)

    def test_user_login_with_email(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"login_identifier": "john@example.com", "password": self.user_password},
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["user"].is_authenticated)

    def test_user_registration(self):
        response = self.client.post(
            reverse("accounts:register"),
            {
                "username": "janedoe",
                "email": "jane@example.com",
                "name": "Jane Doe",
                "password1": "NewPassword456!",
                "password2": "NewPassword456!",
                "bio": "Designer & Creator",
                "location": "New York, NY"
            },
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username="janedoe").exists())
        new_user = User.objects.get(username="janedoe")
        self.assertEqual(new_user.email, "jane@example.com")
        self.assertEqual(new_user.display_name, "Jane Doe")

    def test_user_logout(self):
        self.client.login(username="johndoe", password=self.user_password)
        response = self.client.get(reverse("accounts:logout"), follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["user"].is_authenticated)

    def test_profile_view(self):
        response = self.client.get(reverse("accounts:profile", kwargs={"username": "johndoe"}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "John Doe")
        self.assertContains(response, "@johndoe")

    def test_profile_edit(self):
        self.client.login(username="johndoe", password=self.user_password)
        response = self.client.post(
            reverse("accounts:profile_edit"),
            {
                "name": "Johnathan Doe",
                "bio": "Updated bio text",
                "location": "Seattle, WA"
            },
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, "Johnathan Doe")
        self.assertEqual(self.user.location, "Seattle, WA")
