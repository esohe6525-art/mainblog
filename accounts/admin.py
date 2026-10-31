from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ("username", "email", "name", "location", "is_staff", "created_at")
    fieldsets = UserAdmin.fieldsets + (
        ("Profile Information", {"fields": ("name", "bio", "avatar", "location")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Profile Information", {"fields": ("email", "name", "bio", "avatar", "location")}),
    )
