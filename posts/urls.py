from django.urls import path
from . import views

app_name = "posts"

urlpatterns = [
    path("", views.feed_view, name="feed"),
    path("new/", views.post_create_view, name="post_create"),
    path("<int:pk>/", views.post_detail_view, name="post_detail"),
    path("<int:pk>/like/", views.like_toggle_view, name="like_toggle"),
    path("<int:pk>/comment/", views.comment_create_view, name="comment_create"),
    path("<int:pk>/delete/", views.post_delete_view, name="post_delete"),
    path("comment/<int:pk>/delete/", views.comment_delete_view, name="comment_delete"),
]
