from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User


class LoginForm(forms.Form):
    login_identifier = forms.CharField(
        label="Username or Email",
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Enter your username or email",
                "autocomplete": "username",
                "required": True,
            }
        ),
    )
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": "Enter your password",
                "autocomplete": "current-password",
                "required": True,
            }
        ),
    )


class RegisterForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(
            attrs={"class": "form-control", "placeholder": "you@example.com"}
        ),
    )
    name = forms.CharField(
        label="Full Name",
        required=False,
        widget=forms.TextInput(
            attrs={"class": "form-control", "placeholder": "e.g. Alex Morgan"}
        ),
    )
    bio = forms.CharField(
        required=False,
        widget=forms.Textarea(
            attrs={
                "class": "form-control",
                "rows": 3,
                "placeholder": "Tell us something about yourself...",
            }
        ),
    )
    location = forms.CharField(
        required=False,
        widget=forms.TextInput(
            attrs={"class": "form-control", "placeholder": "City, Country"}
        ),
    )
    avatar = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={"class": "form-control", "accept": "image/*"}),
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email", "name", "avatar", "bio", "location")
        widgets = {
            "username": forms.TextInput(
                attrs={"class": "form-control", "placeholder": "e.g. alex"}
            ),
        }

    def clean_email(self):
        email = self.cleaned_data.get("email").strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email


class ProfileEditForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("name", "bio", "location", "avatar")
        widgets = {
            "name": forms.TextInput(
                attrs={"class": "form-control", "placeholder": "Your display name"}
            ),
            "bio": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 3,
                    "placeholder": "A brief bio about who you are...",
                }
            ),
            "location": forms.TextInput(
                attrs={"class": "form-control", "placeholder": "e.g. San Francisco, CA"}
            ),
            "avatar": forms.FileInput(
                attrs={"class": "form-control", "accept": "image/*"}
            ),
        }
