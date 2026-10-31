from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from .forms import LoginForm, ProfileEditForm, RegisterForm
from .models import User


def register_view(request):
    if request.user.is_authenticated:
        return redirect("posts:feed")

    if request.method == "POST":
        form = RegisterForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"Welcome to Mini Social, @{user.username}!")
            return redirect("posts:feed")
    else:
        form = RegisterForm()

    return render(request, "accounts/register.html", {"form": form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("posts:feed")

    next_url = request.GET.get("next") or request.POST.get("next") or "posts:feed"

    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            identifier = form.cleaned_data["login_identifier"].strip()
            password = form.cleaned_data["password"]

            # Try authenticating by username first
            user = authenticate(request, username=identifier, password=password)

            # If not found, try matching by email
            if user is None:
                try:
                    user_obj = User.objects.get(email__iexact=identifier)
                    user = authenticate(
                        request, username=user_obj.username, password=password
                    )
                except User.DoesNotExist:
                    user = None

            if user is not None:
                login(request, user)
                messages.success(request, f"Welcome back, @{user.username}!")
                return redirect(next_url)
            else:
                form.add_error(None, "Invalid username/email or password.")
    else:
        form = LoginForm()

    return render(
        request, "accounts/login.html", {"form": form, "next_url": next_url}
    )


def logout_view(request):
    if request.method == "POST" or request.method == "GET":
        logout(request)
        messages.info(request, "You have been logged out.")
    return redirect("accounts:login")


def profile_view(request, username=None):
    if username:
        profile_user = get_object_or_404(User, username=username)
    else:
        if not request.user.is_authenticated:
            return redirect("accounts:login")
        profile_user = request.user

    user_posts = (
        profile_user.posts.select_related("author")
        .prefetch_related("likes", "comments")
        .order_by("-created_at")
    )

    context = {
        "profile_user": profile_user,
        "posts": user_posts,
        "is_own_profile": request.user.is_authenticated
        and request.user == profile_user,
    }
    return render(request, "accounts/profile.html", context)


@login_required
def profile_edit_view(request):
    if request.method == "POST":
        form = ProfileEditForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Your profile has been updated successfully.")
            return redirect("accounts:profile", username=request.user.username)
    else:
        form = ProfileEditForm(instance=request.user)

    return render(request, "accounts/profile_edit.html", {"form": form})
