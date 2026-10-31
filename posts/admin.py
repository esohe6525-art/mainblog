from django.contrib import admin
from .models import Comment, Post


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "snippet", "like_count", "comment_count", "created_at")
    list_filter = ("created_at", "author")
    search_fields = ("content", "author__username", "author__name")
    inlines = [CommentInline]

    def snippet(self, obj):
        return obj.content[:40] + ("..." if len(obj.content) > 40 else "")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "author", "content_snippet", "created_at")
    list_filter = ("created_at", "author")
    search_fields = ("content", "author__username")

    def content_snippet(self, obj):
        return obj.content[:30]
