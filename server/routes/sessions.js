const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const SkillRequest = require('../models/SkillRequest');

// @route   POST api/sessions
// @desc    Create a new session from an accepted request
// @access  Private
router.post('/', auth, async (req, res) => {
  const { requestId, scheduledAt, duration, meetLink, notes, totalDays } = req.body;
  try {
    const request = await SkillRequest.findById(requestId);
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    
    // Automatically accept the request if it's pending
    if (request.status === 'pending') {
      request.status = 'accepted';
      await request.save();
    } else if (request.status !== 'accepted') {
      return res.status(400).json({ msg: 'Request must be pending or accepted' });
    }

    const newSession = new Session({
      skillRequest: requestId,
      teacher: request.provider,
      learner: request.requester,
      skill: request.skill,
      scheduledAt,
      duration,
      meetLink,
      notes,
      totalDays
    });

    const session = await newSession.save();
    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/sessions
// @desc    Get all sessions for current user (as teacher or learner)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ teacher: req.user.id }, { learner: req.user.id }]
    }).populate('teacher', ['name', 'profilePic'])
      .populate('learner', ['name', 'profilePic'])
      .sort({ scheduledAt: 1 });
    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id
// @desc    Update session (cancel, complete, update link)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { status, meetLink, notes, scheduledAt } = req.body;
  try {
    let session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ msg: 'Session not found' });

    // Auth check
    if (session.teacher.toString() !== req.user.id && session.learner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (status) session.status = status;
    if (meetLink !== undefined) session.meetLink = meetLink;
    if (notes !== undefined) session.notes = notes;
    if (scheduledAt) session.scheduledAt = scheduledAt;

    await session.save();
    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/sessions/:id
// @desc    Delete a session
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ msg: 'Session not found' });

    // Auth check
    if (session.teacher.toString() !== req.user.id && session.learner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await session.deleteOne();
    res.json({ msg: 'Session removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
