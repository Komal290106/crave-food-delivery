const BiteMatch = require('../models/BiteMatch');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { getIO } = require('../sockets/socketHandler');

/**
 * POST /api/match/create
 * Creates a new BiteMatch session with a randomized deck of candidate dishes
 */
exports.createSession = async (req, res, next) => {
  try {
    const {
      creatorName = 'Foodie 1',
      dietPreference = 'all',
      mode = 'duo'
    } = req.body;

    const isSolo = mode === 'solo';
    const sessionCode = `MATCH-${Math.floor(1000 + Math.random() * 9000)}`;

    // Build query for candidate dishes
    let query = { isAvailable: true };
    if (dietPreference === 'pure_veg') {
      query.isVeg = true;
    } else if (dietPreference === 'vegan') {
      query.dietaryTags = 'vegan';
    } else if (dietPreference === 'non_veg') {
      query.isVeg = false;
    }

    // Fetch items with populated restaurant details
    let items = await MenuItem.find(query).populate('restaurantId', 'name isOpen images').limit(40);

    // Filter to only open/valid restaurants
    items = items.filter(i => i.restaurantId);

    // Shuffle candidate items (Fisher-Yates shuffle)
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    // Select top 16 dishes for a snappy, fun swipe session
    const selectedItems = items.slice(0, 16);

    const dishesPayload = selectedItems.map(item => ({
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
      isVeg: item.isVeg,
      description: item.description,
      restaurantId: item.restaurantId._id,
      restaurantName: item.restaurantId.name
    }));

    const session = await BiteMatch.create({
      sessionCode,
      mode: isSolo ? 'solo' : 'duo',
      creator: {
        name: creatorName.trim() || 'Foodie Host',
        userId: req.user?._id || null
      },
      partner: isSolo ? {
        name: creatorName.trim() || 'Foodie Host',
        userId: req.user?._id || null,
        joinedAt: new Date()
      } : {
        name: null,
        userId: null,
        joinedAt: null
      },
      dietPreference,
      dishes: dishesPayload,
      swipes: [],
      matches: [],
      status: isSolo ? 'active' : 'waiting'
    });

    res.status(201).json({
      success: true,
      sessionCode: session.sessionCode,
      session
    });
  } catch (error) {
    next(error);
  }
};

const normalizeSessionCode = (code) => {
  if (!code) return '';
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return clean.startsWith('MATCH-') ? clean : `MATCH-${clean}`;
};

/**
 * GET /api/match/:sessionCode
 * Retrieves the state of an existing BiteMatch room
 */
exports.getSession = async (req, res, next) => {
  try {
    const rawCode = req.params.sessionCode;
    const sessionCode = normalizeSessionCode(rawCode);
    const session = await BiteMatch.findOne({
      $or: [
        { sessionCode: sessionCode },
        { sessionCode: rawCode.toUpperCase() }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `BiteMatch room ${sessionCode} not found or expired.`
      });
    }

    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/match/:sessionCode/join
 * Lets partner / friend join the room
 */
exports.joinSession = async (req, res, next) => {
  try {
    const rawCode = req.params.sessionCode;
    const sessionCode = normalizeSessionCode(rawCode);
    const { partnerName = 'Partner' } = req.body;

    const session = await BiteMatch.findOne({
      $or: [
        { sessionCode: sessionCode },
        { sessionCode: rawCode.toUpperCase() }
      ]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    session.partner = {
      name: partnerName.trim() || 'Foodie Partner',
      userId: req.user?._id || null,
      joinedAt: new Date()
    };
    session.status = 'active';
    await session.save();

    // Broadcast partner arrival via WebSockets
    const io = getIO();
    if (io) {
      io.to(`match:${session.sessionCode}`).emit('bitematch:partner_joined', {
        partnerName: session.partner.name,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `${session.partner.name} joined BiteMatch!`,
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/match/:sessionCode/swipe
 * Records a swipe (Like or Skip) and triggers mutual match detection
 */
exports.recordSwipe = async (req, res, next) => {
  try {
    const rawCode = req.params.sessionCode;
    const sessionCode = normalizeSessionCode(rawCode);
    const { participantName, menuItemId, liked } = req.body;

    if (!participantName || !menuItemId) {
      return res.status(400).json({ success: false, message: 'participantName and menuItemId required.' });
    }

    const session = await BiteMatch.findOne({
      $or: [
        { sessionCode: sessionCode },
        { sessionCode: rawCode.toUpperCase() }
      ]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    // Check if participant has already swiped on this dish
    const existingSwipe = session.swipes.find(
      s => s.participantName === participantName && s.menuItemId.toString() === menuItemId
    );

    if (!existingSwipe) {
      session.swipes.push({
        participantName,
        menuItemId,
        liked: Boolean(liked),
        createdAt: new Date()
      });
    }

    let isMatch = false;
    let matchedDish = null;

    if (liked) {
      if (session.mode === 'duo') {
        // In 2-Player Duo Mode:
        // A match ONLY happens when BOTH creator AND partner have swiped liked=true on this exact dish!
        const hasPartner = Boolean(
          session.partner?.name &&
          session.creator?.name &&
          session.partner.name !== session.creator.name
        );

        if (hasPartner) {
          const otherParticipantSwipes = session.swipes.filter(
            s => s.participantName !== participantName &&
                 s.menuItemId.toString() === menuItemId &&
                 s.liked === true
          );

          if (otherParticipantSwipes.length > 0) {
            // REAL MUTUAL MATCH! Both players swiped right!
            const alreadyMatched = session.matches.some(m => m.menuItemId.toString() === menuItemId);

            if (!alreadyMatched) {
              const dishObj = session.dishes.find(d => d.menuItemId.toString() === menuItemId);
              if (dishObj) {
                matchedDish = {
                  menuItemId: dishObj.menuItemId,
                  name: dishObj.name,
                  price: dishObj.price,
                  category: dishObj.category,
                  image: dishObj.image,
                  isVeg: dishObj.isVeg,
                  restaurantId: dishObj.restaurantId,
                  restaurantName: dishObj.restaurantName,
                  matchedAt: new Date()
                };

                session.matches.push(matchedDish);
                isMatch = true;
              }
            }
          }
        }
      } else {
        // Solo Mode:
        // Save to shortlisted cravings, but NEVER trigger popup interruption!
        const alreadyMatched = session.matches.some(m => m.menuItemId.toString() === menuItemId);
        if (!alreadyMatched) {
          const dishObj = session.dishes.find(d => d.menuItemId.toString() === menuItemId);
          if (dishObj) {
            session.matches.push({
              menuItemId: dishObj.menuItemId,
              name: dishObj.name,
              price: dishObj.price,
              category: dishObj.category,
              image: dishObj.image,
              isVeg: dishObj.isVeg,
              restaurantId: dishObj.restaurantId,
              restaurantName: dishObj.restaurantName,
              matchedAt: new Date()
            });
            isMatch = false;
          }
        }
      }
    }

    await session.save();

    // Broadcast swipe progress & mutual match celebration to room
    const io = getIO();
    if (io) {
      const room = `match:${sessionCode}`;
      
      // Notify partner of swipe count
      io.to(room).emit('bitematch:swipe_update', {
        participantName,
        totalSwipes: session.swipes.filter(s => s.participantName === participantName).length,
        totalDishes: session.dishes.length
      });

      // If mutual match occurred, broadcast instant celebration!
      if (isMatch && matchedDish) {
        io.to(room).emit('bitematch:match_found', {
          matchedDish,
          totalMatches: session.matches.length,
          matches: session.matches,
          celebrationText: `IT’S A MUTUAL MATCH! Both ${session.creator.name} & ${session.partner?.name || 'Partner'} love ${matchedDish.name}!`
        });
      }
    }

    res.status(200).json({
      success: true,
      isMatch,
      matchedDish,
      totalMatches: session.matches.length,
      matches: session.matches
    });
  } catch (error) {
    next(error);
  }
};
