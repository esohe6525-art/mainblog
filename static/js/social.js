/**
 * MiniSocial - Interactive client behaviors
 * Handles dynamic like toggling, image previews, and composer helpers.
 */

// CSRF Cookie helper
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. AJAX Like Button Handler
  document.querySelectorAll('.btn-like-ajax').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const likeUrl = button.getAttribute('data-url');
      const countSpan = button.querySelector('.like-count');

      try {
        const response = await fetch(likeUrl, {
          method: 'POST',
          headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        });

        if (response.redirected) {
          // If redirected to login (not authenticated)
          window.location.href = response.url;
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.liked) {
              button.classList.add('liked');
            } else {
              button.classList.remove('liked');
            }
            if (countSpan) {
              countSpan.textContent = data.like_count;
            }
          }
        }
      } catch (err) {
        console.error('Like toggle error:', err);
      }
    });
  });

  // 2. Post Image File Preview Handler
  const postImageInput = document.getElementById('post-image-input');
  const previewBox = document.getElementById('image-preview-container');

  if (postImageInput && previewBox) {
    postImageInput.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          previewBox.innerHTML = `
            <div class="image-preview-box">
              <img src="${e.target.result}" alt="Post image preview">
              <button type="button" class="remove-img-btn" id="remove-img-btn" title="Remove image">&times;</button>
            </div>
          `;
          previewBox.style.display = 'block';

          document.getElementById('remove-img-btn').addEventListener('click', () => {
            postImageInput.value = '';
            previewBox.innerHTML = '';
            previewBox.style.display = 'none';
          });
        };
        reader.readAsDataURL(file);
      } else {
        previewBox.innerHTML = '';
        previewBox.style.display = 'none';
      }
    });
  }

  // 3. Avatar Upload Live Preview
  const avatarInput = document.querySelector('input[type="file"][name="avatar"]');
  const avatarPreviewImg = document.getElementById('avatar-preview-img');

  if (avatarInput && avatarPreviewImg) {
    avatarInput.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          avatarPreviewImg.src = e.target.result;
          avatarPreviewImg.style.display = 'block';
          const fallback = document.getElementById('avatar-preview-fallback');
          if (fallback) fallback.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 4. Auto-resizing textarea
  const autoTextareas = document.querySelectorAll('.post-input');
  autoTextareas.forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });
});
