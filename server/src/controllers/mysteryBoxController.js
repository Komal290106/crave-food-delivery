const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

const TIER_CONFIG = {
  discovery: {
    id: 'discovery',
    name: 'Bistro Discovery Vault',
    tagline: '1 Signature Main + 1 Secret Dessert or Side',
    price: 249,
    minMenuValue: 340,
    dishesCount: 2
  },
  masterchef: {
    id: 'masterchef',
    name: 'Masterchef Tasting Platter',
    tagline: '1 Signature Main + 1 Starter + 1 Craft Cooler + 1 Secret Dessert',
    price: 399,
    minMenuValue: 560,
    dishesCount: 4
  },
  omakase: {
    id: 'omakase',
    name: 'Grand Michelin Omakase Vault',
    tagline: 'Multi-Course Luxury Feast (2 Mains + 2 Starters + 2 Coolers + Dessert)',
    price: 599,
    minMenuValue: 840,
    dishesCount: 6
  }
};

/**
 * Generates cryptic gourmet clues based on dish name and description
 */
const generateCrypticClue = (dish) => {
  const name = dish.name.toLowerCase();
  const cat = dish.category.toLowerCase();
  const desc = (dish.description || '').toLowerCase();

  if (name.includes('pizza') || cat.includes('pizza')) {
    return `🔥 A charred 48-hour fermented sourdough canvas kissed by 450°C wood-fire, layered with premium cheese and artisan toppings.`;
  }
  if (name.includes('pasta') || name.includes('tagliolini') || name.includes('pappardelle') || cat.includes('pasta')) {
    return `🍝 Hand-rolled silk pasta ribbons tossed in golden butter emulsion and aged 30-month Parmigiano Reggiano.`;
  }
  if (name.includes('ramen') || cat.includes('ramen')) {
    return `🍜 Slow-simmered 24-hour umami broth infused with roasted black garlic oil and handmade alkaline noodles.`;
  }
  if (name.includes('dim sum') || name.includes('gyoza') || name.includes('bao') || name.includes('maki') || cat.includes('sushi')) {
    return `🥢 Translucent bamboo-steamed jewel parcel filled with fragrant herbs and delicate umami filling.`;
  }
  if (name.includes('biryani') || cat.includes('biryani')) {
    return `👑 Royal dum-pukht sealed earthen handi releasing fragrant aged basmati and saffron aroma.`;
  }
  if (name.includes('kebab') || name.includes('tandoor') || name.includes('galouti') || cat.includes('tandoor') || name.includes('tikka')) {
    return `🍢 Melt-in-mouth slow-smoked delicacy marinated in heritage stone-ground spices and browned over live embers.`;
  }
  if (name.includes('quiche') || name.includes('croissant') || cat.includes('boulangerie') || name.includes('sourdough')) {
    return `🥐 Flaky golden Parisian pastry crust folded with churned French butter and savory farm-fresh custard.`;
  }
  if (name.includes('calamari') || name.includes('fritti') || cat.includes('antipasti') || cat.includes('starter') || name.includes('garlic') || name.includes('ciabatta')) {
    return `✨ Flash-crisped golden artisan bites served with delicate house-whipped herb dipping emulsion.`;
  }
  if (name.includes('spritz') || name.includes('cooler') || name.includes('refresher') || cat.includes('beverage') || cat.includes('mocktail')) {
    return `🍹 Cold-pressed sparkling botanical elixir infused with citrus reductions and garden-plucked herbs.`;
  }
  if (name.includes('tiramisu') || cat.includes('dessert') || cat.includes('dolci') || cat.includes('pâtisserie') || name.includes('chocolate') || name.includes('cake') || name.includes('cacao')) {
    return `🍰 Velvety confection blanketed under dark single-origin chocolate dust and artisanal cream layers.`;
  }

  return `🍽️ A signature chef's creation crafted with seasonal micro-greens and slow-reduction emulsion.`;
};

/**
 * GET /api/mystery/tiers
 */
exports.getMysteryTiers = async (req, res) => {
  res.status(200).json({
    success: true,
    tiers: Object.values(TIER_CONFIG)
  });
};

/**
 * POST /api/mystery/generate
 * Gamified Culinary Roulette algorithm that curates a mystery feast box matching diet & budget tier
 */
exports.generateMysteryBox = async (req, res, next) => {
  try {
    const {
      dietPreference = 'all', // 'all' | 'pure_veg' | 'non_veg' | 'vegan'
      budgetTier = 'masterchef' // 'discovery' | 'masterchef' | 'omakase'
    } = req.body;

    const tier = TIER_CONFIG[budgetTier] || TIER_CONFIG.masterchef;

    // Pick from top rated artisanal restaurants
    const restaurants = await Restaurant.find({ isOpen: true }).limit(8);
    if (!restaurants || restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'No artisanal kitchens available.' });
    }

    // Randomize restaurant selection for culinary roulette feel
    const randomRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
    let items = await MenuItem.find({ restaurantId: randomRestaurant._id, isAvailable: true });

    if (!items || items.length < 2) {
      // Fallback to first restaurant with sufficient items
      const fallbackRest = await Restaurant.findOne();
      items = await MenuItem.find({ restaurantId: fallbackRest._id, isAvailable: true });
    }

    // Filter by diet
    let candidateItems = [...items];
    if (dietPreference === 'pure_veg') {
      candidateItems = candidateItems.filter(i => i.isVeg);
    } else if (dietPreference === 'vegan') {
      candidateItems = candidateItems.filter(i => i.dietaryTags?.includes('vegan') || (i.isVeg && !i.allergens?.includes('dairy')));
    }

    if (candidateItems.length === 0) {
      candidateItems = items; // soft fallback
    }

    // Partition into categories: Mains, Starters, Drinks, Desserts
    const mains = candidateItems.filter(i => 
      i.category.toLowerCase().includes('pizza') || 
      i.category.toLowerCase().includes('pasta') || 
      i.category.toLowerCase().includes('main') || 
      i.category.toLowerCase().includes('ramen') || 
      i.category.toLowerCase().includes('biryani') || 
      i.category.toLowerCase().includes('wazwan') ||
      i.category.toLowerCase().includes('boulangerie')
    );

    const starters = candidateItems.filter(i => 
      i.category.toLowerCase().includes('starter') || 
      i.category.toLowerCase().includes('antipasti') || 
      i.category.toLowerCase().includes('bite') || 
      i.category.toLowerCase().includes('maki') ||
      i.name.toLowerCase().includes('garlic')
    );

    const drinks = candidateItems.filter(i => 
      i.category.toLowerCase().includes('beverage') || 
      i.category.toLowerCase().includes('mocktail') || 
      i.category.toLowerCase().includes('cooler') || 
      i.name.toLowerCase().includes('spritz') ||
      i.name.toLowerCase().includes('refresher')
    );

    const desserts = candidateItems.filter(i => 
      i.category.toLowerCase().includes('dessert') || 
      i.category.toLowerCase().includes('dolci') || 
      i.category.toLowerCase().includes('pâtisserie') || 
      i.name.toLowerCase().includes('tiramisu')
    );

    const selectedDishes = [];
    const usedIds = new Set();

    const pickItem = (arr, fallbackArr) => {
      const pool = arr.filter(x => !usedIds.has(x._id.toString()));
      if (pool.length > 0) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        usedIds.add(picked._id.toString());
        return picked;
      }
      const fallbackPool = fallbackArr.filter(x => !usedIds.has(x._id.toString()));
      if (fallbackPool.length > 0) {
        const picked = fallbackPool[0];
        usedIds.add(picked._id.toString());
        return picked;
      }
      return candidateItems[0];
    };

    if (tier.id === 'discovery') {
      // 1 Main + 1 Dessert/Side
      const m = pickItem(mains, candidateItems);
      if (m) selectedDishes.push(m);
      const d = pickItem(desserts, starters);
      if (d) selectedDishes.push(d);
    } else if (tier.id === 'masterchef') {
      // 1 Main + 1 Starter + 1 Drink + 1 Dessert
      const m = pickItem(mains, candidateItems);
      if (m) selectedDishes.push(m);
      const s = pickItem(starters, candidateItems);
      if (s) selectedDishes.push(s);
      const b = pickItem(drinks, candidateItems);
      if (b) selectedDishes.push(b);
      const d = pickItem(desserts, candidateItems);
      if (d) selectedDishes.push(d);
    } else {
      // Omakase: 2 Mains + 2 Starters + 1 Drink + 1 Dessert
      const m1 = pickItem(mains, candidateItems);
      if (m1) selectedDishes.push(m1);
      const m2 = pickItem(mains, candidateItems);
      if (m2) selectedDishes.push(m2);
      const s1 = pickItem(starters, candidateItems);
      if (s1) selectedDishes.push(s1);
      const s2 = pickItem(starters, candidateItems);
      if (s2) selectedDishes.push(s2);
      const b = pickItem(drinks, candidateItems);
      if (b) selectedDishes.push(b);
      const d = pickItem(desserts, candidateItems);
      if (d) selectedDishes.push(d);
    }

    const actualMenuValue = selectedDishes.reduce((sum, item) => sum + (item.price || 0), 0);
    const guaranteedValue = Math.max(actualMenuValue, tier.minMenuValue);
    const savingsAmount = Math.max(0, guaranteedValue - tier.price);
    const savingsPercent = Math.round((savingsAmount / guaranteedValue) * 100);

    const vaultId = `VAULT-${Math.floor(1000 + Math.random() * 9000)}`;

    const clues = selectedDishes.map((dish, idx) => ({
      slot: `Mystery Course #${idx + 1}`,
      categoryHint: dish.category,
      clue: generateCrypticClue(dish),
      isVeg: dish.isVeg
    }));

    res.status(200).json({
      success: true,
      mysteryVault: {
        vaultId,
        tier: {
          id: tier.id,
          name: tier.name,
          price: tier.price,
          guaranteedValue,
          savingsAmount,
          savingsPercent
        },
        restaurant: {
          _id: randomRestaurant._id,
          name: randomRestaurant.name,
          image: randomRestaurant.images?.cover,
          cuisines: randomRestaurant.cuisines
        },
        clues,
        secretDishes: selectedDishes.map(d => ({
          _id: d._id,
          name: d.name,
          price: d.price,
          category: d.category,
          isVeg: d.isVeg,
          image: d.image,
          description: d.description
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
