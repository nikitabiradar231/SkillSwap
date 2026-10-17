const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const SkillRequest = require('../models/SkillRequest');

// @route   POST api/reviews
// @desc    Add a review for a user
// @access  Private
router.post('/', auth, async (req, res) => {
  const { revieweeId, rating, feedback, requestId } = req.body;

  try {
    // Optionally verify that the request was completed
    if (requestId) {
        const request = await SkillRequest.findById(requestId);
        if (!request || request.status !== 'completed') {
            return res.status(400).json({ msg: 'Cannot review an incomplete skill exchange' });
        }
    }

    const newReview = new Review({
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating,
      feedback
    });

    const review = await newReview.save();
    res.json(review);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reviews/:userId
// @desc    Get all reviews for a specific user
// @access  Public
router.get('/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId }).populate('reviewer', ['name', 'profilePic']);
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'User not found' });
    res.status(500).send('Server Error');
  }
});

module.exports = router;
