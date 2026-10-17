const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SkillRequest = require('../models/SkillRequest');
const User = require('../models/User');

// @route   POST api/skills/request
// @desc    Request a skill from a provider
// @access  Private
router.post('/request', auth, async (req, res) => {
  const { providerId, skill, requestType, price, offeredSkill } = req.body;
  try {
    const newRequest = new SkillRequest({
      requester: req.user.id,
      provider: providerId,
      skill,
      offeredSkill,
      requestType: requestType || 'exchange',
      price: price || 0,
      paymentStatus: requestType === 'paid' ? 'pending' : 'none'
    });

    const request = await newRequest.save();
    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/skills/requests/received
// @desc    Get skill requests received by user
// @access  Private
router.get('/requests/received', auth, async (req, res) => {
  try {
    const requests = await SkillRequest.find({ provider: req.user.id }).populate('requester', ['name', 'email', 'profilePic']);
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/skills/requests/sent
// @desc    Get skill requests sent by user
// @access  Private
router.get('/requests/sent', auth, async (req, res) => {
  try {
    const requests = await SkillRequest.find({ requester: req.user.id }).populate('provider', ['name', 'email', 'profilePic']);
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/skills/request/:id/status
// @desc    Update skill request status
// @access  Private
router.put('/request/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  try {
    let request = await SkillRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });

    // Make sure user owns the request (either requester or provider based on what is being updated)
    // providers can accept/reject. requesters can mark completed, etc.
    if (request.provider.toString() !== req.user.id && request.requester.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
    }

    request.status = status;
    await request.save();
    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/skills/users
// @desc    Get all users listing skills
// @access  Public
router.get('/users', async (req, res) => {
  try {
    // Only get users who have a bio or skills setup, skipping the current user if authenticated
    const users = await User.find({ skills: { $exists: true, $not: {$size: 0} } }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/skills/request/:id
// @desc    Delete a skill request
// @access  Private
router.delete('/request/:id', auth, async (req, res) => {
  try {
    const request = await SkillRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });

    // Auth check (either requester or provider can delete/clear the notification)
    if (request.provider.toString() !== req.user.id && request.requester.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await request.deleteOne();
    res.json({ msg: 'Request removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
