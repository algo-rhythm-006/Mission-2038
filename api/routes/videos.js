const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { Video, Analysis, Profile } = require('../models');

// Configure Multer local storage
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

// 1. UPLOAD VIDEO
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const { title, drillType } = req.body;
    
    // Create URL path to local public uploads
    const videoUrl = `/uploads/${req.file.filename}`;

    const video = new Video({
      user: req.user.userId,
      title: title || req.file.originalname,
      url: videoUrl,
      size: req.file.size,
      drillType: drillType || 'shooting',
      status: 'approved',
      isAnalyzed: false
    });

    await video.save();
    res.status(201).json({ message: 'Video uploaded successfully!', video });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: 'Error uploading video: ' + err.message });
  }
});

// 2. GET USER UPLOAD HISTORY
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const videos = await Video.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DELETE VIDEO
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, user: req.user.userId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found or unauthorized.' });
    }

    // Delete local file
    const filePath = path.join(__dirname, '../../public', video.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Video.deleteOne({ _id: video._id });
    await Analysis.deleteMany({ video: video._id });

    res.json({ message: 'Video deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. TRIGGER AND STREAM AI ANALYSIS FROM FASTAPI
router.get('/:id/analyze', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findOne({ _id: videoId, user: req.user.userId });

    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    const drillType = video.drillType || 'shooting';
    const filePath = path.join(__dirname, '../../public', video.url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical video file not found.' });
    }

    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
    const apiUrl = `${FASTAPI_URL}/analyze/${drillType}`;

    // Prepare multi-part form data to send to FastAPI
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('show_visuals', 'True'); // Force generation of MediaPipe frames

    // Set up SSE headers for client response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log(`Forwarding video analysis for ${video.title} (${drillType}) to FastAPI...`);

    const response = await axios({
      method: 'post',
      url: apiUrl,
      data: form,
      headers: form.getHeaders(),
      responseType: 'stream'
    });

    let sseData = '';

    response.data.on('data', (chunk) => {
      const text = chunk.toString();
      res.write(text); // Forward chunk directly to Next.js client

      sseData += text;
    });

    response.data.on('end', async () => {
      try {
        console.log('FastAPI analysis finished. Parsing results...');
        
        // Extract the final result payload from SSE stream data
        // SSE format is data: {"type": "result", "data": {...}}
        const lines = sseData.split('\n\n');
        let finalResult = null;

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.substring(6));
              if (payload.type === 'result') {
                finalResult = payload.data;
              }
            } catch (e) {
              // Ignore partial or image frame parse failures
            }
          }
        }

        if (finalResult) {
          // Save analysis to DB
          const analysis = new Analysis({
            user: req.user.userId,
            video: videoId,
            drillType,
            status: 'completed',
            sessionLog: finalResult.session_log || finalResult.session_data || [],
            stats: finalResult.stats || {},
            report: finalResult.report || 'Coaching insights completed.'
          });
          await analysis.save();

          // Mark video as analyzed
          video.isAnalyzed = true;
          await video.save();

          // Update player profile ratings/skills based on stats
          const profile = await Profile.findOne({ user: req.user.userId });
          if (profile) {
            // Modify skills dynamically
            if (drillType === 'shooting' && finalResult.stats) {
              const flexion = finalResult.stats.avg_flexion || 70;
              const consistency = finalResult.stats.consistency_percent || 50;
              
              // Map shooting metrics to profile ratings
              profile.skills.finishing = Math.min(100, Math.max(40, Math.round(180 - flexion))); // Lower flexion = better bend
              profile.skills.stamina = Math.min(100, Math.max(40, profile.skills.stamina + 2));
              profile.skills.aiScore = Math.round((profile.skills.speed + profile.skills.passing + profile.skills.dribbling + profile.skills.finishing + profile.skills.defending + profile.skills.vision) / 6);
            } else if (drillType === 'dribbling' && finalResult.stats) {
              const control = finalResult.stats.control_rating || 50;
              const touches = finalResult.stats.touches || 5;
              
              profile.skills.dribbling = Math.min(100, Math.max(40, Math.round(control * 1.1)));
              profile.skills.speed = Math.min(100, Math.max(40, profile.skills.speed + Math.min(5, touches)));
              profile.skills.aiScore = Math.round((profile.skills.speed + profile.skills.passing + profile.skills.dribbling + profile.skills.finishing + profile.skills.defending + profile.skills.vision) / 6);
            } else if (drillType === 'goalkeeper' && finalResult.stats) {
              const saves = finalResult.stats.total_saves || 0;
              const reaction = finalResult.stats.avg_reaction_time || 0.5;
              
              profile.skills.defending = Math.min(100, Math.max(40, Math.round(saves * 15)));
              if (reaction > 0) {
                profile.skills.vision = Math.min(100, Math.max(40, Math.round(35 / reaction)));
              }
              profile.skills.aiScore = Math.round((profile.skills.speed + profile.skills.passing + profile.skills.dribbling + profile.skills.finishing + profile.skills.defending + profile.skills.vision) / 6);
            }
            
            // Mark potential
            profile.skills.potential = Math.min(99, profile.skills.aiScore + 8);
            await profile.save();
          }
        }
      } catch (dbErr) {
        console.error('Error saving AI analysis results to DB:', dbErr);
      }
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('FastAPI analysis streaming error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'FastAPI Stream Error: ' + err.message })}\n\n`);
      res.end();
    });

  } catch (err) {
    console.error('Analysis endpoint crash:', err);
    res.status(500).json({ error: 'Server analysis trigger failed: ' + err.message });
  }
});

module.exports = router;
