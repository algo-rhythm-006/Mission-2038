const express = require('express');
const router = express.Router();
const { User, Profile, Video, Analysis, Trial, Tournament } = require('../models');

// AUTHENTICATION MIDDLEWARE FOR SECURE ROUTES
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

// 1. GET CURRENT USER PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId }).populate('user', 'email role');
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET TARGET USER PROFILE BY ID
router.get('/profile/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.userId || req.params.userId }).populate('user', 'email role');
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // Fetch player videos if it's a player profile
    let videos = [];
    if (profile.user.role === 'player') {
      videos = await Video.find({ user: profile.user._id });
    }

    res.json({ profile, videos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. UPDATE CURRENT USER PROFILE
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const updateData = req.body;
    
    // Protect role/user linking
    delete updateData.user;
    delete updateData._id;

    // Direct object assign
    Object.assign(profile, updateData);

    // If age wasn't supplied but DOB was, update age
    if (updateData.dob) {
      const birthDate = new Date(updateData.dob);
      const difference = Date.now() - birthDate.getTime();
      profile.age = Math.floor(difference / (1000 * 60 * 60 * 24 * 365.25));
    }

    await profile.save();
    res.json({ message: 'Profile updated successfully!', profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const topPlayers = await Profile.find({ 'skills.potential': { $exists: true } })
      .populate('user', 'email role')
      .sort({ 'skills.aiScore': -1, 'skills.potential': -1 })
      .limit(20);

    const mapped = topPlayers.filter(p => p.user && p.user.role === 'player');
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PLAYER DASHBOARD DATA
router.get('/player/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await Profile.findOne({ user: userId });
    const videos = await Video.find({ user: userId }).sort({ createdAt: -1 });
    const analyses = await Analysis.find({ user: userId }).sort({ createdAt: -1 });
    const trials = await Trial.find({ player: userId }).populate('scout', 'email').sort({ date: 1 });
    const tournaments = await Tournament.find({ status: 'upcoming' }).limit(5);

    res.json({
      profile,
      videos,
      analyses,
      trials,
      tournaments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SCOUT ADVANCED SEARCH
router.post('/scout/search', authenticateToken, async (req, res) => {
  try {
    const {
      state,
      position,
      minHeight,
      maxHeight,
      minAge,
      maxAge,
      minSpeed,
      minDribbling,
      minPassing,
      minAiScore,
      verifiedOnly,
      queryText
    } = req.body;

    // Filter build
    const filter = {};
    
    // We only search for player profiles
    const playerUsers = await User.find({ role: 'player' }).select('_id');
    const playerUserIds = playerUsers.map(u => u._id);
    filter.user = { $in: playerUserIds };

    if (state) filter.state = new RegExp(state, 'i');
    if (position) {
      filter.$or = [
        { preferredPosition: new RegExp(position, 'i') },
        { secondaryPosition: new RegExp(position, 'i') }
      ];
    }
    
    if (minHeight || maxHeight) {
      filter.height = {};
      if (minHeight) filter.height.$gte = Number(minHeight);
      if (maxHeight) filter.height.$lte = Number(maxHeight);
    }

    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }

    if (minSpeed) filter['skills.speed'] = { $gte: Number(minSpeed) };
    if (minDribbling) filter['skills.dribbling'] = { $gte: Number(minDribbling) };
    if (minPassing) filter['skills.passing'] = { $gte: Number(minPassing) };
    if (minAiScore) filter['skills.aiScore'] = { $gte: Number(minAiScore) };
    if (verifiedOnly) filter.verifiedBadge = true;

    if (queryText) {
      filter.name = new RegExp(queryText, 'i');
    }

    const players = await Profile.find(filter).populate('user', 'email role');
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. SCOUT SAVE PLAYER
router.post('/scout/save', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.body;
    const scoutProfile = await Profile.findOne({ user: req.user.userId });
    if (!scoutProfile) return res.status(404).json({ error: 'Scout profile not found.' });

    if (!scoutProfile.savedPlayers) {
      scoutProfile.savedPlayers = [];
    }

    const idx = scoutProfile.savedPlayers.indexOf(playerId);
    let saved = false;
    if (idx === -1) {
      scoutProfile.savedPlayers.push(playerId);
      saved = true;
    } else {
      scoutProfile.savedPlayers.splice(idx, 1);
    }

    await scoutProfile.save();
    res.json({ message: saved ? 'Player saved!' : 'Player unsaved!', saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. SCOUT SCHEDULE TRIAL
router.post('/scout/trial', authenticateToken, async (req, res) => {
  try {
    const { playerId, date, time, location, notes } = req.body;
    
    const trial = new Trial({
      scout: req.user.userId,
      player: playerId,
      date,
      time,
      location,
      notes
    });

    await trial.save();
    
    // Add trial to notification for player
    const { Notification } = require('../models');
    const scoutProfile = await Profile.findOne({ user: req.user.userId });
    const notification = new Notification({
      user: playerId,
      type: 'trial',
      title: 'New Trial Invite',
      message: `${scoutProfile ? scoutProfile.name : 'A Scout'} has invited you for a trial at ${location} on ${new Date(date).toLocaleDateString()}`,
      data: { trialId: trial._id }
    });
    await notification.save();

    res.status(201).json({ message: 'Trial scheduled successfully!', trial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. SCOUT GET TRIALS AND SAVED PLAYERS
router.get('/scout/dashboard', authenticateToken, async (req, res) => {
  try {
    const scoutProfile = await Profile.findOne({ user: req.user.userId });
    if (!scoutProfile) return res.status(404).json({ error: 'Scout profile not found.' });

    const trials = await Trial.find({ scout: req.user.userId })
      .populate({
        path: 'player',
        select: 'email',
        populate: { path: 'profile' } // Wait, let's fetch profile separately if needed
      })
      .sort({ date: 1 });

    // Populate trials with player profile details manually to avoid deep Mongoose populate issues
    const populatedTrials = [];
    for (let t of trials) {
      const p = await Profile.findOne({ user: t.player._id });
      populatedTrials.push({
        ...t.toObject(),
        playerProfile: p
      });
    }

    const savedPlayerProfiles = await Profile.find({
      user: { $in: scoutProfile.savedPlayers || [] }
    }).populate('user', 'email');

    res.json({
      profile: scoutProfile,
      trials: populatedTrials,
      savedPlayers: savedPlayerProfiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. COACH GET SQUAD & TRIALS
router.get('/coach/dashboard', authenticateToken, async (req, res) => {
  try {
    const coachProfile = await Profile.findOne({ user: req.user.userId });
    if (!coachProfile) return res.status(404).json({ error: 'Coach profile not found.' });

    // Fetch players that are in same club or state
    const teamPlayers = await Profile.find({
      $or: [
        { currentClub: coachProfile.clubRepresenting || 'None' },
        { state: coachProfile.state }
      ]
    }).populate('user', 'email');

    res.json({
      profile: coachProfile,
      team: teamPlayers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. ADMIN DASHBOARD
router.get('/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrators only.' });
    }

    const totalUsers = await User.countDocuments();
    const totalPlayers = await User.countDocuments({ role: 'player' });
    const totalScouts = await User.countDocuments({ role: 'scout' });
    const totalCoaches = await User.countDocuments({ role: 'coach' });
    const totalVideos = await Video.countDocuments();
    const totalAnalyses = await Analysis.countDocuments();

    const pendingScouts = await Profile.find({
      user: { $in: await User.find({ role: 'scout' }).select('_id') },
      verifiedBadge: false
    }).populate('user', 'email');

    const pendingCoaches = await Profile.find({
      user: { $in: await User.find({ role: 'coach' }).select('_id') },
      verifiedBadge: false
    }).populate('user', 'email');

    const recentVideos = await Video.find()
      .populate({
        path: 'user',
        select: 'email',
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const recentVideoProfiles = [];
    for (let v of recentVideos) {
      const p = await Profile.findOne({ user: v.user._id });
      recentVideoProfiles.push({
        ...v.toObject(),
        playerName: p ? p.name : 'Unknown Player'
      });
    }

    res.json({
      stats: {
        totalUsers,
        totalPlayers,
        totalScouts,
        totalCoaches,
        totalVideos,
        totalAnalyses
      },
      pendingScouts,
      pendingCoaches,
      recentVideos: recentVideoProfiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. ADMIN APPROVE VERIFICATION (Scout/Coach)
router.post('/admin/verify', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { targetUserId, verify } = req.body;
    const profile = await Profile.findOne({ user: targetUserId });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    profile.verifiedBadge = !!verify;
    await profile.save();

    // Create notification
    const { Notification } = require('../models');
    const notification = new Notification({
      user: targetUserId,
      type: 'alert',
      title: verify ? 'Account Verified!' : 'Account Verification Revoked',
      message: verify ? 'Your scout/coach verification documents have been reviewed and approved.' : 'Your verification status has been updated by the admin.'
    });
    await notification.save();

    res.json({ message: 'User verification updated successfully!', profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
