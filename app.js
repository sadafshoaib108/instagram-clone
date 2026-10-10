const SUPABASE_URL = "https://upqxqbqbcpnyxfuttasc.supabase.co";
const SUPABASE_KEY = "sb_publishable_9LNXmF1_yp2OVFl7ElnR_w_yYRnXezy";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// SIGN UP
async function signUp() {
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!email || !password) {
    console.log("Please enter email and password.");
    return;
  }

  const { data, error } = await db.auth.signUp({ email, password });

  if (error) {
    console.error("Signup error:", error.message);
    return;
  }

  console.log("Signup result:", data);
}


// LOGIN
async function login() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login error:", error.message);
    return;
  }

  console.log("Logged in:", data.user);

  await getProfile();
  await getPosts();
  await getComments();
  await getFeed();
}


// LOGOUT
async function logout() {
  const { error } = await db.auth.signOut();

  if (error) {
    console.error("Logout error:", error.message);
    return;
  }

  document.getElementById("profile").innerHTML = "";
  console.log("Logged out.");
}


// PROFILE
async function getProfile() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    console.log("Please login first.");
    return;
  }

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error.message);
    return;
  }

  const container = document.getElementById("profile");

  if (!data) {
    container.innerHTML = "<p>Profile not found.</p>";
    return;
  }

  container.innerHTML = `
    <div class="profile-info">
      <div class="profile-avatar">
        ${(data.username || "U").charAt(0).toUpperCase()}
      </div>
      <h3>${data.username || "User"}</h3>
      <p>${data.full_name || ""}</p>
      <p>${data.bio || ""}</p>
    </div>
  `;
}


// CREATE POST
async function createPost() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    console.log("Please login first.");
    return;
  }

  const imageUrl = document.getElementById("post-image").value.trim();
  const caption = document.getElementById("post-caption").value.trim();

  if (!imageUrl) {
    console.log("Please enter an image URL.");
    return;
  }

  const { error } = await db
    .from("posts")
    .insert({
      user_id: user.id,
      image_url: imageUrl,
      caption: caption
    });

  if (error) {
    console.error("Create post error:", error.message);
    return;
  }

  document.getElementById("post-image").value = "";
  document.getElementById("post-caption").value = "";

  await getPosts();
  await getFeed();

  console.log("Post created successfully.");
}


// DISPLAY POSTS WITH INDIVIDUAL COMMENT BOXES
async function getPosts() {
  const { data, error } = await db
    .from("posts")
    .select(`
      *,
      profiles (
        username,
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Posts error:", error.message);
    return;
  }

  const container = document.getElementById("posts");

  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No posts yet.</p>";
    return;
  }

  container.innerHTML = data.map(post => {
    const username = post.profiles?.username || "Instagram User";
    const fullName = post.profiles?.full_name || "";
    const initial = username.charAt(0).toUpperCase();

    return `
      <article class="post-card">

        <div class="post-header">
          <div class="post-avatar">${initial}</div>

          <div class="post-user-info">
            <strong>${username}</strong>
            <span>${fullName}</span>
          </div>
        </div>

        <img
          src="${post.image_url}"
          alt="Post image"
          loading="lazy"
        >

        <div class="post-details">
          <p>
            <strong>${username}</strong>
            ${post.caption || ""}
          </p>

          <div class="post-actions">
            <button onclick="likePost('${post.id}')">
              ❤️ Like
            </button>

            <button onclick="unlikePost('${post.id}')">
              Unlike
            </button>
          </div>

          <div class="post-comments">
            <div id="comments-${post.id}">
              <p>Loading comments...</p>
            </div>

            <div class="add-comment-box">
              <input
                type="text"
                id="comment-${post.id}"
                placeholder="Write a comment..."
              >

              <button onclick="addComment('${post.id}')">
                Post Comment
              </button>
            </div>
          </div>

        </div>
      </article>
    `;
  }).join("");

  await loadCommentsForPosts(data);
}


// LOAD COMMENTS UNDER THEIR RESPECTIVE POSTS
async function loadCommentsForPosts(posts) {
  for (const post of posts) {
    const container = document.getElementById(`comments-${post.id}`);

    if (!container) continue;

    const { data, error } = await db
      .from("comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Post comments error:", error.message);
      container.innerHTML = "<p>Could not load comments.</p>";
      continue;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No comments yet.</p>";
      continue;
    }

    container.innerHTML = data.map(comment => `
      <div class="comment-item">
        <p>${comment.comment_text || ""}</p>
      </div>
    `).join("");
  }
}


// ADD COMMENT TO THE SELECTED POST
async function addComment(postId) {
  const input = document.getElementById(`comment-${postId}`);
  const commentText = input.value.trim();

  if (!commentText) {
    console.log("Please write a comment first.");
    return;
  }

  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
    console.log("Please login first.");
    return;
  }

  const { error } = await db
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      comment_text: commentText
    });

  if (error) {
    console.error("Comment error:", error.message);
    return;
  }

  input.value = "";

  const { data, error: commentsError } = await db
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (commentsError) {
    console.error("Load comments error:", commentsError.message);
    return;
  }

  const container = document.getElementById(`comments-${postId}`);

  if (container) {
    container.innerHTML = data.map(comment => `
      <div class="comment-item">
        <p>${comment.comment_text || ""}</p>
      </div>
    `).join("");
  }

  await getComments();

  console.log("Comment added successfully.");
}


// COMMENTS SIDEBAR
async function getComments() {
  const { data, error } = await db
    .from("comments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Comments error:", error.message);
    return;
  }

  const container = document.getElementById("comments");

  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No comments yet.</p>";
    return;
  }

  container.innerHTML = data.map(comment => `
    <div class="comment-item">
      <p>${comment.comment_text || ""}</p>
    </div>
  `).join("");
}



// LIKE POST
async function likePost(postId) {
  const { data: { user }, error: userError } = await db.auth.getUser();

  if (userError || !user) {
    console.log("Please login first.");
    return;
  }

  if (!postId) {
    const { data: post, error } = await db
      .from("posts")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !post) {
      console.error("Post not found:", error?.message);
      return;
    }

    postId = post.id;
  }

  const { error } = await db
    .from("likes")
    .upsert(
      {
        post_id: postId,
        user_id: user.id
      },
      {
        onConflict: "post_id,user_id",
        ignoreDuplicates: true
      }
    );

  if (error) {
    console.error("Like error:", error.message);
    return;
  }

  console.log("Post liked.");
}


// UNLIKE POST
async function unlikePost(postId) {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    console.log("Please login first.");
    return;
  }

  if (!postId) {
    const { data: post, error } = await db
      .from("posts")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !post) {
      console.error("Post not found:", error?.message);
      return;
    }

    postId = post.id;
  }

  const { error } = await db
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Unlike error:", error.message);
    return;
  }

  console.log("Post unliked.");
}


// FIND ANOTHER USER
async function findAnotherUser() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    console.log("Please login first.");
    return null;
  }

  const { data, error } = await db
    .from("profiles")
    .select("id, username")
    .neq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Find user error:", error.message);
    return null;
  }

  if (!data) {
    console.log("No other profile found.");
    return null;
  }

  return { currentUser: user, targetUser: data };
}


// FOLLOW USER
async function followUser() {
  const result = await findAnotherUser();

  if (!result) return;

  const { error } = await db
    .from("follows")
    .insert({
      follower_id: result.currentUser.id,
      following_id: result.targetUser.id
    });

  if (error) {
    console.error("Follow error:", error.message);
    return;
  }

  console.log("Followed:", result.targetUser.username);

  await getFeed();
}


// UNFOLLOW USER
async function unfollowUser() {
  const result = await findAnotherUser();

  if (!result) return;

  const { error } = await db
    .from("follows")
    .delete()
    .eq("follower_id", result.currentUser.id)
    .eq("following_id", result.targetUser.id);

  if (error) {
    console.error("Unfollow error:", error.message);
    return;
  }

  console.log("Unfollowed:", result.targetUser.username);

  await getFeed();
}


// MY FEED
async function getFeed() {
  const container = document.getElementById("feed");

  if (!container) return;

  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    container.innerHTML = "<p>Please login to view your feed.</p>";
    return;
  }

  const { data: follows, error: followError } = await db
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (followError) {
    console.error("Feed follow error:", followError.message);
    return;
  }

  const followingIds = (follows || []).map(item => item.following_id);

  if (followingIds.length === 0) {
    container.innerHTML = "<p>Follow someone to see their posts here.</p>";
    return;
  }

  const { data: posts, error } = await db
    .from("posts")
    .select("*")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Feed posts error:", error.message);
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = "<p>No posts from followed users yet.</p>";
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="post-card">
      <img src="${post.image_url}" alt="Feed post" loading="lazy">
      <div class="post-details">
        <p>${post.caption || ""}</p>
      </div>
    </article>
  `).join("");
}


// EDGE FUNCTION
async function callEdgeFunction() {
  const { data, error } = await db.functions.invoke("hello-instagram");

  if (error) {
    console.error("Edge Function error:", error.message);
    return;
  }

  console.log("Edge Function response:", data);
}


// INITIAL LOAD
getPosts();
getComments();
callEdgeFunction();