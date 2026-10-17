const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
  const { receiverId, content } = req.body;
  try {
    const senderId = req.user.id;
    // conversationId is just the two sorted IDs joined
    const conversationId = [senderId, receiverId].sort().join('_');

    const newMessage = new Message({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      content
    });

    const message = await newMessage.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages/conversations
// @desc    Get list of users currently chatting with
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Find all messages involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 });

    const conversations = [];
    const seen = new Set();

    for (const msg of messages) {
      const otherUser = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!seen.has(otherUser)) {
        seen.add(otherUser);
        conversations.push({
          otherUserId: otherUser,
          lastMessage: msg.content,
          createdAt: msg.createdAt
        });
      }
    }
    
    // We'd ideally populate the other user's info here, but for now we'll just return IDs
    // and let the frontend handle fetching user details or update this route to populate.
    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages/:otherUserId
// @desc    Get message history with a specific user
// @access  Private
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    const conversationId = [userId, otherUserId].sort().join('_');

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    // Auth check
    if (message.sender.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await message.deleteOne();
    res.json({ msg: 'Message removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/messages/conversation/:otherUserId
// @desc    Delete all messages with a user
// @access  Private
router.delete('/conversation/:otherUserId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    const conversationId = [userId, otherUserId].sort().join('_');

    await Message.deleteMany({ conversationId });
    res.json({ msg: 'Conversation deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
