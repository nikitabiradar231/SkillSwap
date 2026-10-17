const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// @route   POST api/payment/create-payment-intent
// @desc    Create a stripe payment intent
// @access  Private
router.post('/create-payment-intent', auth, async (req, res) => {
  const { amount } = req.body; // amount in cents

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return res.status(400).json({ msg: 'Stripe is not configured in this environment.' });
  }

  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save transaction to DB
    const transaction = new Transaction({
      user: req.user.id,
      amount,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending'
    });
    await transaction.save();

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
