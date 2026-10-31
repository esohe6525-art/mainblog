from django import forms
from .models import Comment, Post


class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ("content", "image")
        widgets = {
            "content": forms.Textarea(
                attrs={
                    "class": "post-input",
                    "placeholder": "What is happening?! Share your thoughts...",
                    "rows": 3,
                    "required": True,
                }
            ),
            "image": forms.FileInput(
                attrs={
                    "class": "file-input",
                    "accept": "image/*",
                    "id": "post-image-input",
                }
            ),
        }


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ("content",)
        widgets = {
            "content": forms.TextInput(
                attrs={
                    "class": "comment-input",
                    "placeholder": "Post your reply...",
                    "required": True,
                    "autocomplete": "off",
                }
            ),
        }
