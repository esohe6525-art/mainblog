from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from .forms import CommentForm, PostForm
from .models import Comment, Post

User = get_user_model()


def feed_view(request):
    query = request.GET.get("q", "").strip()

    posts_qs = (
        Post.objects.select_related("author")
        .prefetch_related("likes", "comments", "comments__author")
        .order_by("-created_at")
    )

    if query:
        posts_qs = posts_qs.filter(
            Q(content__icontains=query)
            | Q(author__username__icontains=query)
            | Q(author__name__icontains=query)
        )

    # Simple pagination: 10 posts per page
    paginator = Paginator(posts_qs, 15)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    # Quick inline post form
    post_form = PostForm()
    comment_form = CommentForm()

    # Active community members for sidebar
    suggested_users = (
        User.objects.exclude(pk=request.user.pk if request.user.is_authenticated else None)
        .annotate(num_posts=Count("posts"))
        .order_by("-num_posts", "-date_joined")[:5]
    )

    context = {
        "page_obj": page_obj,
        "query": query,
        "post_form": post_form,
        "comment_form": comment_form,
        "suggested_users": suggested_users,
    }
    return render(request, "posts/feed.html", context)


@login_required
def post_create_view(request):
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            messages.success(request, "Your post has been published!")
            return redirect("posts:feed")
    else:
        form = PostForm()

    return render(request, "posts/post_create.html", {"form": form})


def post_detail_view(request, pk):
    post = get_object_or_404(
        Post.objects.select_related("author").prefetch_related("likes", "comments__author"),
        pk=pk,
    )
    comments = post.comments.select_related("author").all()
    comment_form = CommentForm()

    context = {
        "post": post,
        "comments": comments,
        "comment_form": comment_form,
        "is_liked": post.is_liked_by(request.user),
    }
    return render(request, "posts/post_detail.html", context)


@login_required
def like_toggle_view(request, pk):
    post = get_object_or_404(Post, pk=pk)
    user = request.user

    if post.likes.filter(pk=user.pk).exists():
        post.likes.remove(user)
        liked = False
    else:
        post.likes.add(user)
        liked = True

    # Support AJAX fetch requests for seamless like without page reloads
    is_ajax = request.headers.get("x-requested-with") == "XMLHttpRequest"
    if is_ajax or request.headers.get("Accept") == "application/json":
        return JsonResponse(
            {
                "success": True,
                "liked": liked,
                "like_count": post.like_count,
            }
        )

    # Fallback to standard HTTP redirect
    referer = request.META.get("HTTP_REFERER")
    if referer:
        return redirect(referer)
    return redirect("posts:post_detail", pk=post.pk)


@login_required
def comment_create_view(request, pk):
    post = get_object_or_404(Post, pk=pk)

    if request.method == "POST":
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.post = post
            comment.author = request.user
            comment.save()
            messages.success(request, "Comment added successfully.")
        else:
            messages.error(request, "Comment could not be posted. Please check your text.")

    referer = request.META.get("HTTP_REFERER")
    if referer and ("posts" in referer or "feed" in referer or referer.endswith("/")):
        return redirect(referer)
    return redirect("posts:post_detail", pk=post.pk)


@login_required
def post_delete_view(request, pk):
    post = get_object_or_404(Post, pk=pk)

    if post.author != request.user and not request.user.is_staff:
        return HttpResponseForbidden("You do not have permission to delete this post.")

    if request.method == "POST":
        post.delete()
        messages.success(request, "Your post was successfully deleted.")
        return redirect("posts:feed")

    return render(request, "posts/post_confirm_delete.html", {"post": post})


@login_required
def comment_delete_view(request, pk):
    comment = get_object_or_404(Comment.objects.select_related("post", "author"), pk=pk)

    # Comment author or post owner can delete
    if comment.author != request.user and comment.post.author != request.user and not request.user.is_staff:
        return HttpResponseForbidden("You do not have permission to delete this comment.")

    post_pk = comment.post.pk
    if request.method == "POST":
        comment.delete()
        messages.success(request, "Comment deleted.")

    referer = request.META.get("HTTP_REFERER")
    if referer:
        return redirect(referer)
    return redirect("posts:post_detail", pk=post_pk)
