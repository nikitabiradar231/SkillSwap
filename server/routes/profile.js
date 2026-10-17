const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const fs = require('fs');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
  }
});

// @route   GET api/profile/:id
// @desc    Get profile by user id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'User not found' });
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
  const { name, bio, skills, skillsToLearn, profilePic, hourlyRate, upiId } = req.body;

  const profileFields = {};
  if (name) profileFields.name = name;
  if (bio !== undefined) profileFields.bio = bio;
  if (skills) {
    profileFields.skills = skills.map(s => ({
      name: s.name,
      price: Number(s.price) || 0
    }));
  }
  if (skillsToLearn) profileFields.skillsToLearn = Array.isArray(skillsToLearn) ? skillsToLearn : skillsToLearn.split(',').map(s => s.trim()).filter(Boolean);
  if (profilePic !== undefined) profileFields.profilePic = profilePic;
  if (hourlyRate !== undefined) profileFields.hourlyRate = Number(hourlyRate);
  if (upiId !== undefined) profileFields.upiId = upiId;

  try {
    let user = await User.findById(req.user.id);

    if (user) {
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: profileFields },
        { new: true }
      ).select('-password');
      return res.json(user);
    }
    
    res.status(404).json({ msg: 'User not found' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profile/wallet
// @desc    Connect/Update wallet address
// @access  Private
router.put('/wallet', auth, async (req, res) => {
  const { walletAddress } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { walletAddress } },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profile/upload
// @desc    Upload profile picture
// @access  Private
router.post('/upload', auth, upload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'Please upload a file' });
    
    // Construct the URL. In production, this would be your domain.
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.json({ url: fileUrl });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
