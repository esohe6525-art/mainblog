/**
 * MiniSocial - single-page client.
 * Renders the feed, posts, profiles and auth screens, and talks to /api/*.
 */
import './style.css';
import {
  AuthError,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
  signup,
  updateUser,
} from '@netlify/identity';

const app = document.getElementById('app');
let me = null;

// ---------- helpers ----------

const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  comment: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  send: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
  photo: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
  camera: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
  user: '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  logout: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
  pin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const linebreaks = (text) => esc(text).replace(/\n/g, '<br>');

function avatar(profile, size) {
  if (profile.avatarUrl) {
    return `<img src="${esc(profile.avatarUrl)}" alt="${esc(profile.username)}" class="avatar avatar-${size}">`;
  }
  return `<div class="avatar avatar-${size} avatar-fallback">${esc(profile.username.slice(0, 1).toUpperCase())}</div>`;
}

function timeSince(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, secs] of units) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

const formatDate = (iso, opts) => new Date(iso).toLocaleString('en-US', opts);

function flash(message, type = 'success') {
  const box = document.getElementById('messages');
  const el = document.createElement('div');
  el.className = `alert alert-${type}`;
  el.innerHTML = `<span>${esc(message)}</span><button class="alert-close" type="button">&times;</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  box.append(el);
  setTimeout(() => el.remove(), 6000);
}

function clearFlashes() {
  document.getElementById('messages').innerHTML = '';
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

function navigate(url, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  window.scrollTo(0, 0);
  render();
}

function loginUrl() {
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}

function requireLogin() {
  if (me) return true;
  navigate(loginUrl(), { replace: true });
  return false;
}

function setTitle(title) {
  document.title = title ? `${title} - MiniSocial` : 'MiniSocial - Connect and Share';
}

function authMessage(error, fallback) {
  if (error instanceof AuthError) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 403) return 'Signups are not allowed on this site right now.';
    return error.message || fallback;
  }
  return error?.message || fallback;
}

function bindImagePreview(input, onChange) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    onChange(file ? URL.createObjectURL(file) : null);
  });
}

// ---------- shared chrome ----------

async function loadMe() {
  const user = await getUser();
  if (!user) {
    me = null;
    return;
  }
  try {
    me = (await api('/me')).user;
  } catch {
    me = null;
  }
}

function renderChrome() {
  const path = location.pathname;
  const nav = document.getElementById('nav-actions');
  const search = document.querySelector('#nav-search input');
  search.value = path === '/' ? new URLSearchParams(location.search).get('q') ?? '' : '';

  nav.innerHTML = `
    <a href="/" class="nav-link ${path === '/' ? 'active' : ''}">${ICONS.home}<span>Feed</span></a>
    ${me ? `
      <a href="/new" class="btn btn-primary btn-sm btn-icon">${ICONS.plus}<span>Post</span></a>
      <div class="user-profile-menu">
        <a href="/u/${esc(me.username)}" class="nav-profile-pill">
          ${avatar(me, 'sm')}
          <span class="nav-username">${esc(me.displayName)}</span>
        </a>
        <button type="button" class="btn btn-ghost btn-sm" title="Log out" data-action="logout">${ICONS.logout}</button>
      </div>` : `
      <a href="/login" class="btn btn-ghost btn-sm">Sign in</a>
      <a href="/register" class="btn btn-primary btn-sm">Join</a>`}
  `;

  document.getElementById('footer-links').innerHTML = me
    ? `<a href="/">Home</a><a href="/u/${esc(me.username)}">Profile</a><a href="/settings">Settings</a>`
    : `<a href="/">Home</a><a href="/login">Sign in</a><a href="/register">Create account</a>`;
}

// ---------- post rendering ----------

function likeButton(post) {
  if (!me) {
    return `<a href="${esc(loginUrl())}" class="btn-action btn-like" title="Sign in to like">${ICONS.heart}<span>${post.likeCount}</span></a>`;
  }
  return `<button type="button" class="btn-action btn-like ${post.liked ? 'liked' : ''}" data-action="like" data-id="${post.id}" title="Like post">
    ${ICONS.heart}<span class="like-count">${post.likeCount}</span></button>`;
}

function postCard(post, { showComments = true } = {}) {
  const profileUrl = `/u/${esc(post.author.username)}`;
  const comments = showComments && post.comments.length
    ? `<div class="post-comments-preview"><div class="comment-list">
        ${post.comments.map((c) => `
          <div class="comment-item">
            <a href="/u/${esc(c.author.username)}">${avatar(c.author, 'sm')}</a>
            <div class="comment-bubble">
              <div class="comment-header">
                <a href="/u/${esc(c.author.username)}" class="comment-author">${esc(c.author.displayName)}</a>
                <span class="comment-time">${timeSince(c.createdAt)}</span>
              </div>
              <div class="comment-body">${esc(c.content)}</div>
            </div>
          </div>`).join('')}
      </div></div>`
    : '';

  const replyForm = showComments && me
    ? `<form class="comment-form" data-action="comment" data-id="${post.id}">
        ${avatar(me, 'sm')}
        <input type="text" name="content" class="comment-input" placeholder="Write a reply..." required autocomplete="off" maxlength="500">
        <button type="submit" class="btn btn-ghost btn-sm" title="Reply">${ICONS.send}</button>
      </form>`
    : '';

  return `
    <article class="card post-card" id="post-${post.id}">
      <div class="post-header">
        <div class="post-author-info">
          <a href="${profileUrl}">${avatar(post.author, 'md')}</a>
          <div class="post-meta">
            <a href="${profileUrl}" class="post-author-name">${esc(post.author.displayName)}</a>
            <span class="post-author-handle">@${esc(post.author.username)} &bull; ${timeSince(post.createdAt)}</span>
          </div>
        </div>
        ${post.isOwner ? `<a href="/posts/${post.id}/delete" class="btn btn-ghost btn-sm" title="Delete post" style="color: var(--text-subtle);">${ICONS.trash}</a>` : ''}
      </div>
      <div class="post-content">${linebreaks(post.content)}</div>
      ${post.imageUrl ? `<div class="post-media"><a href="/posts/${post.id}"><img src="${esc(post.imageUrl)}" alt="Post image" loading="lazy"></a></div>` : ''}
      <div class="post-actions">
        <div class="action-group">
          ${likeButton(post)}
          <a href="/posts/${post.id}" class="btn-action" title="View discussion">${ICONS.comment}<span>${post.commentCount}</span></a>
        </div>
        <a href="/posts/${post.id}" class="btn-action" style="font-size: 0.8rem;">Full Thread &rarr;</a>
      </div>
      ${comments}
      ${replyForm}
    </article>`;
}

function pagination(page, totalPages, params) {
  if (totalPages <= 1) return '';
  const link = (p) => {
    const next = new URLSearchParams(params);
    next.set('page', p);
    return `?${next}`;
  };
  return `
    <div style="display: flex; justify-content: center; gap: 0.5rem; margin: 2rem 0;">
      ${page > 1 ? `<a href="${link(page - 1)}" class="btn btn-outline btn-sm">&larr; Previous</a>` : ''}
      <span style="display: flex; align-items: center; padding: 0 0.75rem; font-size: 0.9rem; color: var(--text-muted);">Page ${page} of ${totalPages}</span>
      ${page < totalPages ? `<a href="${link(page + 1)}" class="btn btn-outline btn-sm">Next &rarr;</a>` : ''}
    </div>`;
}

function composerForm({ standalone = false } = {}) {
  return `
    <form data-action="create-post">
      <div class="composer-header">
        ${avatar(me, 'md')}
        <div class="composer-body">
          <textarea name="content" class="post-input" rows="${standalone ? 5 : 3}" placeholder="What's on your mind, ${esc(me.displayName)}?" required maxlength="5000"></textarea>
          <div class="image-preview-box" data-preview style="display: none;">
            <img alt="Selected image preview">
            <button type="button" class="remove-img-btn" data-remove-image title="Remove image">&times;</button>
          </div>
          <div class="composer-footer">
            <div class="composer-tools">
              <label class="upload-icon-btn" title="Attach an image">
                ${ICONS.photo}<span>Photo</span>
                <input type="file" name="image" class="file-input" accept="image/jpeg,image/png,image/gif,image/webp">
              </label>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Post</button>
          </div>
        </div>
      </div>
    </form>`;
}

function wireComposer(root) {
  const form = root.querySelector('form[data-action="create-post"]');
  if (!form) return;
  const input = form.querySelector('input[type="file"]');
  const preview = form.querySelector('[data-preview]');
  bindImagePreview(input, (src) => {
    preview.style.display = src ? 'inline-block' : 'none';
    if (src) preview.querySelector('img').src = src;
  });
  form.querySelector('[data-remove-image]').addEventListener('click', () => {
    input.value = '';
    preview.style.display = 'none';
  });
}

// ---------- views ----------

async function feedView() {
  const params = new URLSearchParams(location.search);
  const q = (params.get('q') ?? '').trim();
  const page = Number(params.get('page')) || 1;
  setTitle('Feed');

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  query.set('page', page);
  const [feed, { members }] = await Promise.all([api(`/posts?${query}`), api('/members')]);

  const leftCard = me
    ? `<div class="card profile-card-widget">
        <a href="/u/${esc(me.username)}">${avatar(me, 'lg')}</a>
        <h2 class="profile-card-name">${esc(me.displayName)}</h2>
        <p class="profile-card-handle">@${esc(me.username)}</p>
        ${me.bio ? `<p class="profile-card-bio">${esc(me.bio.length > 90 ? `${me.bio.slice(0, 89)}…` : me.bio)}</p>` : ''}
        <div class="profile-stats-row">
          <div class="profile-stat-item"><span class="stat-value">${me.stats.posts}</span><span class="stat-label">Posts</span></div>
          <div class="profile-stat-item"><span class="stat-value">${me.stats.likes}</span><span class="stat-label">Likes</span></div>
        </div>
        <a href="/u/${esc(me.username)}" class="btn btn-outline btn-sm" style="width: 100%;">View Profile</a>
      </div>`
    : `<div class="card profile-card-widget">
        <h2 class="profile-card-name" style="margin-bottom: 0.5rem;">Join MiniSocial</h2>
        <p class="profile-card-bio">Connect with friends, share updates, upload photos, and like posts in real time.</p>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
          <a href="/register" class="btn btn-primary btn-sm">Create Account</a>
          <a href="/login" class="btn btn-outline btn-sm">Sign In</a>
        </div>
      </div>`;

  const posts = feed.posts.length
    ? feed.posts.map((p) => postCard(p)).join('') + pagination(feed.page, feed.totalPages, q ? { q } : {})
    : `<div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">No posts yet</h3>
        <p style="color: var(--text-muted); font-size: 0.92rem; max-width: 380px; margin: 0 auto 1.5rem auto;">
          ${q ? `No posts matched your search for "${esc(q)}". Try searching for something else!` : 'Be the first person to share a post and start the conversation!'}
        </p>
        ${me ? '<a href="/new" class="btn btn-primary btn-sm">Create First Post</a>' : '<a href="/register" class="btn btn-primary btn-sm">Join to Post</a>'}
      </div>`;

  app.innerHTML = `
    <div class="feed-grid">
      <aside class="sidebar-left"><div class="sidebar-sticky">${leftCard}</div></aside>
      <section class="feed-main">
        ${me ? `<div class="card composer-card">${composerForm()}</div>` : ''}
        ${q ? `<div class="card" style="padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
            <span>Showing results for: <strong>"${esc(q)}"</strong></span>
            <a href="/" class="btn btn-ghost btn-sm">Clear search</a>
          </div>` : ''}
        ${posts}
      </section>
      <aside class="sidebar-right"><div class="sidebar-sticky">
        ${members.length ? `<div class="card">
          <h3 class="widget-title">Community Members</h3>
          <div class="user-list">
            ${members.map((m) => `
              <div class="user-item">
                <div class="user-item-info">
                  <a href="/u/${esc(m.username)}">${avatar(m, 'sm')}</a>
                  <div class="user-item-names">
                    <a href="/u/${esc(m.username)}" class="user-item-name">${esc(m.displayName)}</a>
                    <div class="user-item-handle">@${esc(m.username)}</div>
                  </div>
                </div>
                <a href="/u/${esc(m.username)}" class="btn btn-ghost btn-sm" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;">View</a>
              </div>`).join('')}
          </div>
        </div>` : ''}
        <div class="card" style="background-color: var(--primary-light); border-color: #bfdbfe;">
          <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--primary-hover); margin-bottom: 0.4rem;">About MiniSocial</h4>
          <p style="font-size: 0.82rem; color: #1e3a8a; line-height: 1.4;">
            A lightweight social web app featuring accounts, profile pictures, posts with photos, likes, and comment threads.
          </p>
        </div>
      </div></aside>
    </div>`;
  wireComposer(app);
}

function newPostView() {
  if (!requireLogin()) return;
  setTitle('New Post');
  app.innerHTML = `
    <div style="max-width: 640px; margin: 0 auto;">
      <div style="margin-bottom: 1rem;"><a href="/" class="btn btn-ghost btn-sm">&larr; Back to Feed</a></div>
      <div class="card composer-card">
        <h1 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 1rem;">Create a post</h1>
        ${composerForm({ standalone: true })}
      </div>
    </div>`;
  wireComposer(app);
}

async function postDetailView(id) {
  const { post } = await api(`/posts/${id}`);
  setTitle(`${post.author.displayName}'s Post`);
  const profileUrl = `/u/${esc(post.author.username)}`;

  app.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto;">
      <div style="margin-bottom: 1rem;"><a href="/" class="btn btn-ghost btn-sm">&larr; Back to Feed</a></div>
      <article class="card post-card">
        <div class="post-header">
          <div class="post-author-info">
            <a href="${profileUrl}">${avatar(post.author, 'md')}</a>
            <div class="post-meta">
              <a href="${profileUrl}" class="post-author-name">${esc(post.author.displayName)}</a>
              <span class="post-author-handle">@${esc(post.author.username)} &bull; ${formatDate(post.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
          </div>
          ${post.isOwner ? `<a href="/posts/${post.id}/delete" class="btn btn-danger-outline btn-sm" title="Delete post">${ICONS.trash}<span>Delete</span></a>` : ''}
        </div>
        <div class="post-content" style="font-size: 1.15rem; margin: 1rem 0;">${linebreaks(post.content)}</div>
        ${post.imageUrl ? `<div class="post-media" style="margin: 1.25rem 0;"><img src="${esc(post.imageUrl)}" alt="Post image"></div>` : ''}
        <div class="post-actions" style="padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <div class="action-group">
            ${likeButton(post)}
            <span class="btn-action" style="cursor: default;">${ICONS.comment}<span>${post.commentCount} comments</span></span>
          </div>
        </div>
      </article>

      <div class="card" style="margin-top: 1.5rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1.25rem;">Discussion</h3>
        ${me ? `
          <form data-action="comment" data-id="${post.id}" style="margin-bottom: 2rem;">
            <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
              ${avatar(me, 'md')}
              <div style="flex: 1;">
                <textarea name="content" class="comment-input" rows="2" placeholder="Write a reply..." required maxlength="500" style="width: 100%;"></textarea>
                <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
                  <button type="submit" class="btn btn-primary btn-sm">Reply</button>
                </div>
              </div>
            </div>
          </form>` : `
          <div style="padding: 1rem; background-color: var(--bg-input); border-radius: var(--radius-md); text-align: center; margin-bottom: 1.5rem;">
            <p style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 0.5rem;">Sign in to join the conversation and comment on this post.</p>
            <a href="${esc(loginUrl())}" class="btn btn-primary btn-sm">Sign In</a>
          </div>`}
        ${post.comments.length ? `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${post.comments.map((c) => `
              <div style="display: flex; gap: 0.75rem; align-items: flex-start;" id="comment-${c.id}">
                <a href="/u/${esc(c.author.username)}">${avatar(c.author, 'sm')}</a>
                <div style="flex: 1; background-color: var(--bg-input); border-radius: var(--radius-md); padding: 0.75rem 1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                    <div>
                      <a href="/u/${esc(c.author.username)}" style="font-weight: 700; font-size: 0.9rem;">${esc(c.author.displayName)}</a>
                      <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.35rem;">@${esc(c.author.username)} &bull; ${timeSince(c.createdAt)}</span>
                    </div>
                    ${c.canDelete ? `<button type="button" class="btn btn-ghost btn-sm" data-action="delete-comment" data-id="${c.id}" title="Delete comment" style="color: var(--text-subtle); padding: 0.15rem 0.4rem;">&times;</button>` : ''}
                  </div>
                  <div style="font-size: 0.92rem; color: var(--text-main); word-break: break-word;">${linebreaks(c.content)}</div>
                </div>
              </div>`).join('')}
          </div>` : `
          <p style="text-align: center; color: var(--text-muted); font-size: 0.92rem; padding: 1.5rem 0;">No comments yet. Be the first to reply!</p>`}
      </div>
    </div>`;
}

async function deletePostView(id) {
  if (!requireLogin()) return;
  const { post } = await api(`/posts/${id}`);
  if (!post.isOwner) {
    flash('You can only delete your own posts.', 'error');
    navigate(`/posts/${id}`, { replace: true });
    return;
  }
  setTitle('Delete Post');
  app.innerHTML = `
    <div class="auth-container">
      <div class="card auth-card" style="text-align: center;">
        <div class="auth-header">
          <h1>Delete this post?</h1>
          <p>This permanently removes the post along with its likes and comments.</p>
        </div>
        <div style="background-color: var(--bg-input); border-radius: var(--radius-md); padding: 1rem; text-align: left; margin-bottom: 1.5rem; font-size: 0.92rem;">
          ${esc(post.content.length > 160 ? `${post.content.slice(0, 159)}…` : post.content)}
        </div>
        <div style="display: flex; justify-content: center; gap: 0.75rem;">
          <a href="/posts/${post.id}" class="btn btn-outline btn-sm">Cancel</a>
          <button type="button" class="btn btn-primary btn-sm" data-action="confirm-delete-post" data-id="${post.id}" style="background-color: var(--accent-heart);">Yes, delete</button>
        </div>
      </div>
    </div>`;
}

async function profileView(username) {
  const params = new URLSearchParams(location.search);
  const page = Number(params.get('page')) || 1;
  const data = await api(`/users/${encodeURIComponent(username)}?page=${page}`);
  const p = data.profile;
  setTitle(`${p.displayName} (@${p.username})`);

  app.innerHTML = `
    <div style="max-width: 760px; margin: 0 auto;">
      <div class="card profile-header-card">
        <div class="profile-banner"></div>
        <div class="profile-info-wrap">
          <div style="position: relative;">${avatar(p, 'xl').replace('class="avatar', 'class="profile-avatar-large avatar')}</div>
          <div>${data.isOwnProfile ? '<a href="/settings" class="btn btn-outline btn-sm">Edit Profile</a>' : ''}</div>
        </div>
        <div class="profile-details">
          <h1 class="profile-title-name">${esc(p.displayName)}</h1>
          <div class="profile-title-handle">@${esc(p.username)}</div>
          ${p.bio ? `<p class="profile-bio-text">${linebreaks(p.bio)}</p>` : ''}
          <div class="profile-meta-badges">
            ${p.location ? `<div class="badge-item">${ICONS.pin}<span>${esc(p.location)}</span></div>` : ''}
            <div class="badge-item">${ICONS.calendar}<span>Joined ${formatDate(p.createdAt, { month: 'long', year: 'numeric' })}</span></div>
          </div>
          <div class="profile-stats-row" style="max-width: 400px; margin-bottom: 0;">
            <div class="profile-stat-item"><span class="stat-value">${p.stats.posts}</span><span class="stat-label">Posts</span></div>
            <div class="profile-stat-item"><span class="stat-value">${p.stats.likes}</span><span class="stat-label">Likes Received</span></div>
            <div class="profile-stat-item"><span class="stat-value">${p.stats.comments}</span><span class="stat-label">Comments</span></div>
          </div>
        </div>
      </div>

      <div style="margin-top: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem;">Posts by ${esc(p.displayName)}</h3>
        ${data.posts.length
          ? data.posts.map((post) => postCard(post, { showComments: false })).join('') + pagination(data.page, data.totalPages, {})
          : `<div class="card" style="text-align: center; padding: 2.5rem 1rem;">
              <p style="color: var(--text-muted); font-size: 0.95rem;">${esc(p.displayName)} has not published any posts yet.</p>
            </div>`}
      </div>
    </div>`;
}

function loginView() {
  if (me) return navigate('/', { replace: true });
  setTitle('Sign In');
  app.innerHTML = `
    <div class="auth-container">
      <div class="card auth-card">
        <div class="auth-header">
          <h1>Welcome back</h1>
          <p>Log in with your email address</p>
        </div>
        <form data-action="login">
          <div class="alert alert-error" data-error style="display: none; margin-bottom: 1rem;"></div>
          <div class="form-group">
            <label for="login-email">Email address</label>
            <input type="email" id="login-email" name="email" class="form-control" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" name="password" class="form-control" placeholder="Your password" required autocomplete="current-password">
          </div>
          <div class="auth-link-row"><a href="/forgot-password">Forgot password?</a></div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; padding: 0.7rem;">Sign In</button>
        </form>
        <div class="auth-footer">Don't have an account yet? <a href="/register">Create an account</a></div>
      </div>
    </div>`;
}

function registerView() {
  if (me) return navigate('/', { replace: true });
  setTitle('Create Account');
  app.innerHTML = `
    <div class="auth-container" style="max-width: 520px;">
      <div class="card auth-card">
        <div class="auth-header">
          <h1>Create your account</h1>
          <p>Join MiniSocial to share thoughts and connect with others</p>
        </div>
        <form data-action="register">
          <div class="alert alert-error" data-error style="display: none; margin-bottom: 1rem;"></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label for="reg-username">Username *</label>
              <input type="text" id="reg-username" name="username" class="form-control" placeholder="e.g. alex" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+" title="Letters, numbers and underscores only">
            </div>
            <div class="form-group">
              <label for="reg-name">Full Name</label>
              <input type="text" id="reg-name" name="name" class="form-control" placeholder="e.g. Alex Morgan" maxlength="150">
            </div>
          </div>
          <div class="form-group">
            <label for="reg-email">Email address *</label>
            <input type="email" id="reg-email" name="email" class="form-control" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="reg-password1">Password *</label>
            <input type="password" id="reg-password1" name="password1" class="form-control" placeholder="Create a strong password" required minlength="8" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label for="reg-password2">Confirm Password *</label>
            <input type="password" id="reg-password2" name="password2" class="form-control" placeholder="Re-type your password" required autocomplete="new-password">
          </div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">You can add a profile picture, bio and location after signing in.</p>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem;">Create Account</button>
        </form>
        <div class="auth-footer">Already have an account? <a href="/login">Sign in</a></div>
      </div>
    </div>`;
}

function forgotPasswordView() {
  setTitle('Reset Password');
  app.innerHTML = `
    <div class="auth-container">
      <div class="card auth-card">
        <div class="auth-header">
          <h1>Reset your password</h1>
          <p>We'll email you a link to choose a new one</p>
        </div>
        <form data-action="forgot-password">
          <div class="form-group">
            <label for="forgot-email">Email address</label>
            <input type="email" id="forgot-email" name="email" class="form-control" placeholder="you@example.com" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.7rem;">Send reset link</button>
        </form>
        <div class="auth-footer"><a href="/login">Back to sign in</a></div>
      </div>
    </div>`;
}

function newPasswordView() {
  setTitle('Choose a New Password');
  app.innerHTML = `
    <div class="auth-container">
      <div class="card auth-card">
        <div class="auth-header">
          <h1>Choose a new password</h1>
          <p>Enter a new password for your account</p>
        </div>
        <form data-action="new-password">
          <div class="alert alert-error" data-error style="display: none; margin-bottom: 1rem;"></div>
          <div class="form-group">
            <label for="new-password">New password</label>
            <input type="password" id="new-password" name="password" class="form-control" required minlength="8" autocomplete="new-password">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.7rem;">Save password</button>
        </form>
      </div>
    </div>`;
}

function settingsView() {
  if (!requireLogin()) return;
  setTitle('Edit Profile');
  app.innerHTML = `
    <div class="auth-container" style="max-width: 540px;">
      <div style="margin-bottom: 1rem;"><a href="/u/${esc(me.username)}" class="btn btn-ghost btn-sm">&larr; Back to Profile</a></div>
      <div class="card auth-card">
        <div class="auth-header">
          <h1>Edit Profile</h1>
          <p>Update your personal info and avatar</p>
        </div>
        <form data-action="edit-profile">
          <div class="alert alert-error" data-error style="display: none; margin-bottom: 1rem;"></div>
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="position: relative; display: inline-block;">
              <img data-avatar-img src="${esc(me.avatarUrl ?? '')}" alt="Avatar" class="avatar avatar-xl" style="${me.avatarUrl ? '' : 'display: none;'} margin: 0 auto; border: 3px solid var(--border-color);">
              <div data-avatar-fallback class="avatar avatar-xl avatar-fallback" style="${me.avatarUrl ? 'display: none;' : ''} margin: 0 auto;">${esc(me.username.slice(0, 1).toUpperCase())}</div>
            </div>
            <div style="margin-top: 0.6rem;">
              <label class="upload-icon-btn" style="cursor: pointer; display: inline-flex;">
                ${ICONS.camera}<span>Change Profile Picture</span>
                <input type="file" name="avatar" accept="image/jpeg,image/png,image/gif,image/webp" style="display: none;">
              </label>
            </div>
          </div>
          <div class="form-group">
            <label for="edit-name">Display Name</label>
            <input type="text" id="edit-name" name="name" class="form-control" placeholder="Your display name" maxlength="150" value="${esc(me.name)}">
          </div>
          <div class="form-group">
            <label for="edit-location">Location</label>
            <input type="text" id="edit-location" name="location" class="form-control" placeholder="e.g. San Francisco, CA" maxlength="100" value="${esc(me.location)}">
          </div>
          <div class="form-group">
            <label for="edit-bio">Bio</label>
            <textarea id="edit-bio" name="bio" class="form-control" rows="3" placeholder="Tell people a little about yourself" maxlength="300">${esc(me.bio)}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <a href="/u/${esc(me.username)}" class="btn btn-outline btn-sm">Cancel</a>
            <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
          </div>
        </form>
      </div>
    </div>`;

  const img = app.querySelector('[data-avatar-img]');
  const fallback = app.querySelector('[data-avatar-fallback]');
  bindImagePreview(app.querySelector('input[name="avatar"]'), (src) => {
    if (!src) return;
    img.src = src;
    img.style.display = '';
    fallback.style.display = 'none';
  });
}

function notFoundView() {
  setTitle('Page Not Found');
  app.innerHTML = `
    <div class="card" style="max-width: 520px; margin: 2rem auto; text-align: center; padding: 3rem 1.5rem;">
      <h1 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.5rem;">Page not found</h1>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">The page you're looking for doesn't exist or was removed.</p>
      <a href="/" class="btn btn-primary btn-sm">Back to Feed</a>
    </div>`;
}

// ---------- router ----------

const routes = [
  [/^\/$/, feedView],
  [/^\/new\/?$/, newPostView],
  [/^\/posts\/(\d+)\/?$/, postDetailView],
  [/^\/posts\/(\d+)\/delete\/?$/, deletePostView],
  [/^\/u\/([A-Za-z0-9_]+)\/?$/, profileView],
  [/^\/login\/?$/, loginView],
  [/^\/register\/?$/, registerView],
  [/^\/forgot-password\/?$/, forgotPasswordView],
  [/^\/new-password\/?$/, newPasswordView],
  [/^\/settings\/?$/, settingsView],
];

async function render() {
  renderChrome();
  const path = location.pathname;
  for (const [pattern, view] of routes) {
    const match = path.match(pattern);
    if (!match) continue;
    try {
      await view(...match.slice(1));
    } catch (error) {
      if (error.status === 404) notFoundView();
      else app.innerHTML = `<div class="card" style="max-width: 520px; margin: 2rem auto; text-align: center;">${esc(error.message)}</div>`;
    }
    return;
  }
  notFoundView();
}

// ---------- event handling ----------

async function refreshAfterAuth(next = '/') {
  await loadMe();
  navigate(next, { replace: true });
}

function safeNext() {
  const next = new URLSearchParams(location.search).get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function showFormError(form, message) {
  const box = form.querySelector('[data-error]');
  if (!box) return flash(message, 'error');
  box.textContent = message;
  box.style.display = '';
}

const formHandlers = {
  async login(form) {
    const data = new FormData(form);
    await login(data.get('email'), data.get('password'));
    await refreshAfterAuth(safeNext());
    flash(`Welcome back, @${me?.username ?? 'friend'}!`);
  },

  async register(form) {
    const data = new FormData(form);
    const username = String(data.get('username')).trim().toLowerCase();
    if (data.get('password1') !== data.get('password2')) throw new Error("The two passwords don't match.");
    const taken = await api(`/users/${encodeURIComponent(username)}`).then(() => true, () => false);
    if (taken) throw new Error('That username is already taken.');

    const user = await signup(data.get('email'), data.get('password1'), {
      full_name: String(data.get('name')).trim(),
      username,
    });
    if (user.emailVerified) {
      await refreshAfterAuth('/');
      flash(`Welcome to MiniSocial, @${me?.username ?? username}!`);
    } else {
      navigate('/login', { replace: true });
      flash('Almost there! Check your email to confirm your account, then sign in.', 'info');
    }
  },

  async 'forgot-password'(form) {
    await requestPasswordRecovery(new FormData(form).get('email'));
    flash('If that email has an account, a reset link is on its way.', 'info');
    form.reset();
  },

  async 'new-password'(form) {
    await updateUser({ password: new FormData(form).get('password') });
    await refreshAfterAuth('/');
    flash('Your password has been updated.');
  },

  async 'edit-profile'(form) {
    await api('/me', { method: 'PUT', body: new FormData(form) });
    await loadMe();
    navigate(`/u/${me.username}`);
    flash('Your profile has been updated successfully.');
  },

  async 'create-post'(form) {
    await api('/posts', { method: 'POST', body: new FormData(form) });
    await loadMe();
    navigate('/');
    flash('Your post has been published!');
  },

  async comment(form) {
    const content = new FormData(form).get('content');
    await api(`/posts/${form.dataset.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    await render();
    flash('Comment added successfully.');
  },
};

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (form.id === 'nav-search') {
    event.preventDefault();
    const q = form.q.value.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
    return;
  }
  const handler = formHandlers[form.dataset.action];
  if (!handler) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    await handler(form);
  } catch (error) {
    if (error.status === 401) {
      await loadMe();
      return navigate(loginUrl(), { replace: true });
    }
    showFormError(form, authMessage(error, 'Something went wrong. Please try again.'));
  } finally {
    if (button && button.isConnected) button.disabled = false;
  }
});

const clickHandlers = {
  async like(button) {
    const { liked, likeCount } = await api(`/posts/${button.dataset.id}/like`, { method: 'POST' });
    button.classList.toggle('liked', liked);
    button.querySelector('.like-count').textContent = likeCount;
  },

  async 'delete-comment'(button) {
    if (!confirm('Delete this comment?')) return;
    await api(`/comments/${button.dataset.id}`, { method: 'DELETE' });
    await render();
    flash('Comment deleted.');
  },

  async 'confirm-delete-post'(button) {
    await api(`/posts/${button.dataset.id}`, { method: 'DELETE' });
    await loadMe();
    navigate('/', { replace: true });
    flash('Your post was successfully deleted.');
  },

  async logout() {
    await logout().catch(() => {});
    me = null;
    navigate('/login');
    flash('You have been logged out.', 'info');
  },
};

document.addEventListener('click', async (event) => {
  const actionEl = event.target.closest('[data-action]');
  if (actionEl && actionEl.tagName !== 'FORM' && clickHandlers[actionEl.dataset.action]) {
    event.preventDefault();
    actionEl.disabled = true;
    try {
      await clickHandlers[actionEl.dataset.action](actionEl);
    } catch (error) {
      if (error.status === 401) navigate(loginUrl());
      else flash(error.message, 'error');
    } finally {
      actionEl.disabled = false;
    }
    return;
  }

  // Client-side navigation for internal links
  const link = event.target.closest('a[href]');
  if (!link || link.target || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  event.preventDefault();
  clearFlashes();
  navigate(url.pathname + url.search);
});

window.addEventListener('popstate', () => render());

// ---------- boot ----------

async function boot() {
  let callback = null;
  try {
    callback = await handleAuthCallback();
  } catch (error) {
    flash(authMessage(error, 'That link is invalid or has expired.'), 'error');
  }

  await loadMe();

  if (callback?.type === 'recovery') {
    history.replaceState(null, '', '/new-password');
  } else if (callback?.type === 'confirmation') {
    history.replaceState(null, '', '/');
    flash('Email confirmed. Welcome to MiniSocial!');
  } else if (callback) {
    history.replaceState(null, '', location.pathname + location.search);
  }

  onAuthChange(async (event) => {
    if (event === 'login' || event === 'logout') {
      await loadMe();
      renderChrome();
    }
  });

  await render();
}

boot();
