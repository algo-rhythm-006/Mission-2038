const express = require('express');
const router = express.Router();
const { Post, Comment, Follower, Chat, Message, Notification, Profile, User } = require('../models');

// AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required.' });

  const JWT_SECRET = process.env.JWT_SECRET || 'mission2k38_jwt_secret_key_998877_super_secure';
  require('jsonwebtoken').verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    req.userId = user?.userId || user?.id;
    next();
  });
};

// 1. GET ALL POSTS (SOCIAL FEED)
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'email role')
      .sort({ createdAt: -1 });

    const populatedPosts = [];
    for (let post of posts) {
      const profile = await Profile.findOne({ user: post.user._id });
      populatedPosts.push({
        ...post.toObject(),
        authorProfile: profile
      });
    }

    res.json(populatedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE POST
router.post('/posts', authenticateToken, async (req, res) => {
  try {
    const { text, mediaUrl, mediaType } = req.body;
    const post = new Post({
      user: req.user.userId,
      text,
      mediaUrl,
      mediaType
    });

    await post.save();
    
    // Auto-populate author profile before response
    const profile = await Profile.findOne({ user: req.user.userId });
    res.status(201).json({
      ...post.toObject(),
      authorProfile: profile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. LIKE / UNLIKE POST
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const idx = post.likes.indexOf(req.user.userId);
    let liked = false;
    if (idx === -1) {
      post.likes.push(req.user.userId);
      liked = true;

      // Send notification to post author
      if (post.user.toString() !== req.user.userId) {
        const likerProfile = await Profile.findOne({ user: req.user.userId });
        const notification = new Notification({
          user: post.user,
          type: 'like',
          title: 'Post Liked',
          message: `${likerProfile ? likerProfile.name : 'Someone'} liked your post.`,
          data: { postId: post._id }
        });
        await notification.save();
      }
    } else {
      post.likes.splice(idx, 1);
    }

    await post.save();
    res.json({ likesCount: post.likes.length, liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ADD COMMENT
router.post('/posts/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const comment = new Comment({
      post: post._id,
      user: req.user.userId,
      text
    });

    await comment.save();

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    const profile = await Profile.findOne({ user: req.user.userId });

    // Notify post author
    if (post.user.toString() !== req.user.userId) {
      const commenterProfile = await Profile.findOne({ user: req.user.userId });
      const notification = new Notification({
        user: post.user,
        type: 'comment',
        title: 'New Comment',
        message: `${commenterProfile ? commenterProfile.name : 'Someone'} commented: "${text.substring(0, 30)}..."`,
        data: { postId: post._id }
      });
      await notification.save();
    }

    res.status(201).json({
      ...comment.toObject(),
      authorProfile: profile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET POST COMMENTS
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id }).sort({ createdAt: 1 });
    const populatedComments = [];
    for (let c of comments) {
      const profile = await Profile.findOne({ user: c.user });
      populatedComments.push({
        ...c.toObject(),
        authorProfile: profile
      });
    }
    res.json(populatedComments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. FOLLOW / UNFOLLOW USER
router.post('/users/:id/follow', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user.userId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const existingFollow = await Follower.findOne({
      user: targetUserId,
      follower: req.user.userId
    });

    let following = false;
    if (!existingFollow) {
      const newFollow = new Follower({
        user: targetUserId,
        follower: req.user.userId
      });
      await newFollow.save();
      following = true;

      // Notify followed user
      const followerProfile = await Profile.findOne({ user: req.user.userId });
      const notification = new Notification({
        user: targetUserId,
        type: 'follow',
        title: 'New Follower',
        message: `${followerProfile ? followerProfile.name : 'Someone'} started following you.`,
        data: { followerId: req.user.userId }
      });
      await notification.save();
    } else {
      await Follower.deleteOne({ _id: existingFollow._id });
    }

    res.json({ following });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET CHATS HISTORY
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.userId
    }).sort({ lastMessageAt: -1 });

    const populatedChats = [];
    for (let chat of chats) {
      const otherParticipantId = chat.participants.find(p => p.toString() !== req.user.userId);
      const otherUser = await User.findById(otherParticipantId).select('email role');
      const otherProfile = await Profile.findOne({ user: otherParticipantId });
      
      populatedChats.push({
        _id: chat._id,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        otherUser,
        otherProfile
      });
    }

    res.json(populatedChats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. START CHAT WITH USER
router.post('/chats/start', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user.userId, targetUserId] }
    });

    if (!chat) {
      chat = new Chat({
        participants: [req.user.userId, targetUserId],
        lastMessage: 'Chat initialized.',
        lastMessageAt: new Date()
      });
      await chat.save();
    }

    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. GET MESSAGES IN CHAT
router.get('/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Unauthorized chat access.' });
    }

    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. GET NOTIFICATIONS
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. MARK NOTIFICATIONS AS READ
router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.userId });
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });

    notification.read = true;
    await notification.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
