const MealSubscription = require('../models/MealSubscription');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

// GET /api/subscriptions/my - Fetch current user's meal subscription
exports.getMySubscription = async (req, res, next) => {
  try {
    const sub = await MealSubscription.findOne({ userId: req.user._id });
    res.status(200).json({
      success: true,
      subscription: sub || null
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions - Create or update meal subscription
exports.saveSubscription = async (req, res, next) => {
  try {
    const { planName, deskLocation, weeklySchedule } = req.body;

    if (!deskLocation?.addressLine) {
      return res.status(400).json({ success: false, message: 'Desk or office address is required.' });
    }

    if (!weeklySchedule || !Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
      return res.status(400).json({ success: false, message: 'Please schedule at least one weekly meal.' });
    }

    const weeklyTotal = weeklySchedule.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

    let sub = await MealSubscription.findOne({ userId: req.user._id });

    if (sub) {
      sub.planName = planName || sub.planName;
      sub.deskLocation = deskLocation;
      sub.weeklySchedule = weeklySchedule;
      sub.weeklyTotal = weeklyTotal;
      sub.status = 'active';
      await sub.save();
    } else {
      sub = new MealSubscription({
        userId: req.user._id,
        planName: planName || 'Artisan Weekly Desk Routine',
        deskLocation,
        weeklySchedule,
        weeklyTotal,
        status: 'active'
      });
      await sub.save();
    }

    res.status(200).json({
      success: true,
      message: 'Weekly Desk Meal Routine activated successfully!',
      subscription: sub
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/subscriptions/toggle-status - Pause / Resume subscription
exports.toggleSubscriptionStatus = async (req, res, next) => {
  try {
    const sub = await MealSubscription.findOne({ userId: req.user._id });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found.' });
    }

    sub.status = sub.status === 'active' ? 'paused' : 'active';
    await sub.save();

    res.status(200).json({
      success: true,
      message: `Meal Subscription ${sub.status === 'active' ? 'Resumed' : 'Paused'} successfully.`,
      status: sub.status,
      subscription: sub
    });
  } catch (error) {
    next(error);
  }
};
