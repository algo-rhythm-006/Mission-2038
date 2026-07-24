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
    const profile = await Profile.findOne({ user: req.params.userId }).populate('user', 'email role');
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

    const updateData = { ...req.body };
    
    // Protect role/user linking
    delete updateData.user;
    delete updateData._id;

    // Handle nested emergencyContact if passed as flat fields
    if (updateData.emergencyContactName !== undefined || updateData.emergencyContactPhone !== undefined || updateData.emergencyContactRelation !== undefined) {
      updateData.emergencyContact = {
        name: updateData.emergencyContactName ?? profile.emergencyContact?.name ?? '',
        phone: updateData.emergencyContactPhone ?? profile.emergencyContact?.phone ?? '',
        relation: updateData.emergencyContactRelation ?? profile.emergencyContact?.relation ?? ''
      };
      delete updateData.emergencyContactName;
      delete updateData.emergencyContactPhone;
      delete updateData.emergencyContactRelation;
    }

    // Handle nested socials if passed as flat fields
    if (updateData.instagram !== undefined || updateData.facebook !== undefined || updateData.youtube !== undefined) {
      updateData.socials = {
        instagram: updateData.instagram ?? profile.socials?.instagram ?? '',
        facebook: updateData.facebook ?? profile.socials?.facebook ?? '',
        youtube: updateData.youtube ?? profile.socials?.youtube ?? ''
      };
      delete updateData.instagram;
      delete updateData.facebook;
      delete updateData.youtube;
    }

    // If DOB provided, calculate age
    if (updateData.dob) {
      const birthDate = new Date(updateData.dob);
      if (!isNaN(birthDate.getTime())) {
        const difference = Date.now() - birthDate.getTime();
        updateData.age = Math.floor(difference / (1000 * 60 * 60 * 24 * 365.25));
      }
    }

    // Direct object assign
    Object.assign(profile, updateData);

    await profile.save();
    const updatedProfile = await Profile.findById(profile._id).populate('user', 'email role');

    res.json({ message: 'Profile updated successfully!', profile: updatedProfile });
  } catch (err) {
    console.error('Profile update error:', err);
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

// HELPER TO SAFELY MATCH PLAYER IDS ACROSS POPULATED AND UNPOPULATED OBJECTS
const isPlayerMatch = (applicantPlayer, targetUserId) => {
  if (!applicantPlayer || !targetUserId) return false;
  const targetStr = targetUserId.toString();

  if (typeof applicantPlayer === 'string') return applicantPlayer === targetStr;
  if (applicantPlayer._id) return applicantPlayer._id.toString() === targetStr;
  if (applicantPlayer.id) return applicantPlayer.id.toString() === targetStr;
  if (typeof applicantPlayer.toString === 'function') return applicantPlayer.toString() === targetStr;
  return String(applicantPlayer) === targetStr;
};

// 5. PLAYER DASHBOARD DATA
router.get('/player/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    const profile = await Profile.findOne({ user: userId });
    const videos = await Video.find({ user: userId }).sort({ createdAt: -1 });
    const analyses = await Analysis.find({ user: userId }).sort({ createdAt: -1 });

    const pAge = profile?.ageCategory || 'Senior';
    const pPos = profile?.preferredPosition || 'ST';

    // Fetch public trials, private invitations, and applied trials
    const allTrials = await Trial.find({
      $or: [
        { privacy: 'public' },
        { privacy: 'private', invitedPlayers: userId },
        { 'applicants.player': userId }
      ]
    }).populate('scout', 'email').sort({ createdAt: -1 });

    const activeTrials = allTrials.filter(t => {
      const myApp = (t.applicants || []).find(a => isPlayerMatch(a.player, userId));

      // Remove rejected/declined trials completely
      if (myApp && myApp.status === 'rejected') {
        return false;
      }

      // Keep accepted or pending registered trials
      if (myApp) {
        return true;
      }

      // Keep new unresponded private invitations or matching public trials
      if (t.privacy === 'private') return true;
      const matchesAge = (!t.ageCategory || t.ageCategory.length === 0 || t.ageCategory.includes(pAge));
      const matchesPos = (!t.positionsTarget || t.positionsTarget.length === 0 || t.positionsTarget.includes(pPos));
      return matchesAge && matchesPos;
    });

    // Fetch scout profiles for clean scoutName resolution
    const scoutUserIds = Array.from(new Set(activeTrials.map(t => {
      if (!t.scout) return null;
      return t.scout._id ? t.scout._id.toString() : t.scout.toString();
    }).filter(Boolean)));

    const scoutProfiles = await Profile.find({ user: { $in: scoutUserIds } }).populate('user', 'email');
    const scoutProfileMap = {};
    scoutProfiles.forEach(sp => {
      const uId = sp.user?._id?.toString() || sp.user?.toString();
      if (uId) scoutProfileMap[uId] = sp;
    });

    // Format trials with player's application status & scout name
    const formattedTrials = activeTrials.map(t => {
      const tObj = typeof t.toObject === 'function' ? t.toObject() : t;
      const myApp = (tObj.applicants || []).find(a => isPlayerMatch(a.player, userId));
      tObj.isRegistered = !!myApp;
      tObj.myStatus = myApp ? myApp.status : null;

      const sId = t.scout?._id?.toString() || t.scout?.toString();
      const sProfile = scoutProfileMap[sId];
      
      let resolvedName = sProfile?.name;
      if (!resolvedName && t.scout?.email) {
        resolvedName = t.scout.email.split('@')[0];
      }
      if (!resolvedName && sProfile?.user?.email) {
        resolvedName = sProfile.user.email.split('@')[0];
      }

      tObj.scoutName = resolvedName || 'Scout Organizer';
      tObj.scoutOrganization = sProfile?.organization || sProfile?.clubRepresenting || '';
      return tObj;
    });

    const tournaments = await Tournament.find({ status: 'upcoming' }).limit(5);

    res.json({
      profile,
      videos,
      analyses,
      trials: formattedTrials,
      tournaments
    });
  } catch (err) {
    console.error('Error fetching player dashboard:', err);
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
    const scoutUserId = req.user._id || req.user.id || req.user.userId;
    const scoutProfile = await Profile.findOne({ user: scoutUserId });
    if (!scoutProfile) return res.status(404).json({ error: 'Scout profile not found.' });

    if (!scoutProfile.savedPlayers) {
      scoutProfile.savedPlayers = [];
    }

    const targetIdStr = (typeof playerId === 'object' && playerId) ? (playerId._id || playerId.id) : String(playerId);

    let playerUserId = targetIdStr;
    const foundProfile = await Profile.findOne({ $or: [{ _id: targetIdStr }, { user: targetIdStr }] });
    if (foundProfile && foundProfile.user) {
      playerUserId = foundProfile.user.toString();
    }

    const existingStrList = scoutProfile.savedPlayers.map(id => id.toString());
    const idx = existingStrList.indexOf(playerUserId);

    let saved = false;
    if (idx === -1) {
      scoutProfile.savedPlayers.push(playerUserId);
      saved = true;
    } else {
      scoutProfile.savedPlayers.splice(idx, 1);
    }

    await scoutProfile.save();
    res.json({ message: saved ? 'Player prospect saved!' : 'Player prospect removed from saved list.', saved, savedPlayers: scoutProfile.savedPlayers });
  } catch (err) {
    console.error('Error toggling saved player:', err);
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
    const scoutUserId = req.user._id || req.user.id || req.user.userId;
    const scoutProfile = await Profile.findOne({ user: scoutUserId });
    if (!scoutProfile) return res.status(404).json({ error: 'Scout profile not found.' });

    const trials = await Trial.find({ scout: scoutUserId })
      .populate('invitedPlayers', 'email')
      .populate('applicants.player', 'email')
      .sort({ date: 1 });

    let acceptedCount = 0;
    trials.forEach(t => {
      if (t.applicants) {
        acceptedCount += t.applicants.filter(a => a.status === 'accepted').length;
      }
    });

    const savedPlayerProfiles = await Profile.find({
      user: { $in: scoutProfile.savedPlayers || [] }
    }).populate('user', 'email');

    res.json({
      profile: scoutProfile,
      trials,
      savedPlayers: savedPlayerProfiles,
      acceptedCount
    });
  } catch (err) {
    console.error('Error loading scout dashboard:', err);
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
