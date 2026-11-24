const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

/**
 * POST /api/party/calculate
 * Computes an optimized party feast package supporting multiple party themes (Italian, Pan-Asian, Royal Indian, Gourmet Bistro)
 * and event types (Birthday, Game Night, House Party, Office Lunch)
 */
exports.calculatePartyFeast = async (req, res, next) => {
  try {
    const {
      totalGuests = 8,
      vegCount = 5,
      nonVegCount = 3,
      cuisineTheme = 'italian', // 'italian' | 'indian' | 'asian' | 'bistro'
      eventType = 'birthday' // 'birthday' | 'game_night' | 'house_party' | 'office'
    } = req.body;

    const total = Math.max(2, Number(totalGuests) || 8);
    const veg = Math.max(0, Number(vegCount) || 0);
    const nonVeg = Math.max(0, Number(nonVegCount) || 0);

    // Filter restaurant matching theme
    let restaurantKeywords = ['osteria', 'bellini'];
    if (cuisineTheme === 'indian') restaurantKeywords = ['bukhara', 'awadh', 'wazwan'];
    if (cuisineTheme === 'asian') restaurantKeywords = ['dragonfly', 'umami', 'ramen'];
    if (cuisineTheme === 'bistro') restaurantKeywords = ['maison', 'bistro'];

    const matchedRestaurants = await Restaurant.find({
      name: { $regex: new RegExp(restaurantKeywords.join('|'), 'i') }
    });

    const targetRestaurant = matchedRestaurants.length > 0 ? matchedRestaurants[0] : await Restaurant.findOne();
    const items = await MenuItem.find({ restaurantId: targetRestaurant._id, isAvailable: true });

    // Portion Sizing Formulas based on Catering Science:
    // - Mains / Pizzas: ~2.5 slices per person (8 slices/pizza)
    // - Curries / Pastas: 1 platter per 3 people
    // - Starters / Breads: 1 per 2.5 people
    // - Desserts: 1 per 2 people
    // - Mocktails / Coolers: 1 per person (Total Guests)
    let numMains = Math.max(2, Math.ceil((total * 2.5) / 8));
    let numSecondary = Math.max(1, Math.ceil(total / 3));
    let numStarters = Math.max(2, Math.ceil(total / 2.5));
    let numDesserts = Math.max(1, Math.ceil(total / 2));
    let numBeverages = total; // 1 drink per person

    // Adjust based on event preset
    if (eventType === 'game_night') {
      numMains += 1;
      numStarters += 1;
      numDesserts = Math.max(1, Math.floor(total / 3));
    } else if (eventType === 'house_party') {
      numStarters += 2;
      numBeverages = Math.ceil(total * 1.5);
    } else if (eventType === 'office') {
      numSecondary += 1;
      numDesserts = Math.max(1, Math.floor(total / 3));
    }

    const vegMainsNeeded = Math.max(1, Math.round((veg / total) * numMains));
    const nonVegMainsNeeded = Math.max(nonVeg > 0 ? 1 : 0, numMains - vegMainsNeeded);

    const vegItems = items.filter(i => i.isVeg);
    const nonVegItems = items.filter(i => !i.isVeg);

    const selectedDishes = [];
    let estimatedTotal = 0;
    const usedItemIds = new Set();

    // 1. Primary Mains (Veg)
    const vegMain = vegItems.find(i => !usedItemIds.has(i._id.toString())) || vegItems[0] || items[0];
    if (vegMain && vegMainsNeeded > 0) {
      usedItemIds.add(vegMain._id.toString());
      selectedDishes.push({
        item: vegMain,
        category: `${vegMain.category} (Veg)`,
        quantity: vegMainsNeeded,
        itemTotal: vegMain.price * vegMainsNeeded
      });
      estimatedTotal += vegMain.price * vegMainsNeeded;
    }

    // 2. Primary Mains (Non-Veg)
    const nonVegMain = nonVegItems.find(i => !usedItemIds.has(i._id.toString())) || nonVegItems[0] || vegItems[1];
    if (nonVegMain && nonVegMainsNeeded > 0) {
      usedItemIds.add(nonVegMain._id.toString());
      selectedDishes.push({
        item: nonVegMain,
        category: `${nonVegMain.category} (Non-Veg)`,
        quantity: nonVegMainsNeeded,
        itemTotal: nonVegMain.price * nonVegMainsNeeded
      });
      estimatedTotal += nonVegMain.price * nonVegMainsNeeded;
    }

    // 3. Secondary Platter (Pastas / Noodles / Platters)
    const secondaryItem = items.find(i => 
      !usedItemIds.has(i._id.toString()) && 
      (i.category.toLowerCase().includes('pasta') || i.category.toLowerCase().includes('noodle') || i.category.toLowerCase().includes('ramen') || i.category.toLowerCase().includes('boulangerie'))
    ) || items.find(i => !usedItemIds.has(i._id.toString())) || items[1];
    
    if (secondaryItem) {
      usedItemIds.add(secondaryItem._id.toString());
      selectedDishes.push({
        item: secondaryItem,
        category: `${secondaryItem.category} Platter`,
        quantity: numSecondary,
        itemTotal: secondaryItem.price * numSecondary
      });
      estimatedTotal += secondaryItem.price * numSecondary;
    }

    // 4. Starters / Appetizers / Breads
    const starterItem = items.find(i => 
      !usedItemIds.has(i._id.toString()) && 
      (i.category.toLowerCase().includes('starter') || i.category.toLowerCase().includes('antipasti') || i.category.toLowerCase().includes('bites') || i.name.toLowerCase().includes('garlic') || i.name.toLowerCase().includes('ciabatta'))
    ) || items.find(i => !usedItemIds.has(i._id.toString())) || items[2];

    if (starterItem) {
      usedItemIds.add(starterItem._id.toString());
      selectedDishes.push({
        item: starterItem,
        category: 'Party Starters & Appetizers',
        quantity: numStarters,
        itemTotal: starterItem.price * numStarters
      });
      estimatedTotal += starterItem.price * numStarters;
    }

    // 5. Artisanal Drinks / Mocktails
    const beverageItem = items.find(i => 
      !usedItemIds.has(i._id.toString()) && 
      (i.category.toLowerCase().includes('beverage') || i.category.toLowerCase().includes('mocktail') || i.category.toLowerCase().includes('cooler') || i.name.toLowerCase().includes('spritz') || i.name.toLowerCase().includes('lemonade') || i.name.toLowerCase().includes('refresher'))
    );

    if (beverageItem) {
      usedItemIds.add(beverageItem._id.toString());
      selectedDishes.push({
        item: beverageItem,
        category: 'Artisanal Mocktails & Coolers',
        quantity: numBeverages,
        itemTotal: beverageItem.price * numBeverages
      });
      estimatedTotal += beverageItem.price * numBeverages;
    }

    // 6. Desserts
    const dessertItem = items.find(i => 
      !usedItemIds.has(i._id.toString()) && 
      (i.category.toLowerCase().includes('dolci') || i.category.toLowerCase().includes('dessert') || i.category.toLowerCase().includes('pâtisserie') || i.name.toLowerCase().includes('tiramisu'))
    ) || items.find(i => !usedItemIds.has(i._id.toString())) || items[items.length - 1];

    if (dessertItem) {
      usedItemIds.add(dessertItem._id.toString());
      selectedDishes.push({
        item: dessertItem,
        category: 'Sweet Endings & Desserts',
        quantity: numDesserts,
        itemTotal: dessertItem.price * numDesserts
      });
      estimatedTotal += dessertItem.price * numDesserts;
    }

    const perPersonCost = Math.round(estimatedTotal / total);

    res.status(200).json({
      success: true,
      partyPlan: {
        totalGuests: total,
        vegGuests: veg,
        nonVegGuests: nonVeg,
        cuisineTheme,
        eventType,
        restaurant: {
          _id: targetRestaurant._id,
          name: targetRestaurant.name,
          image: targetRestaurant.images?.cover
        },
        recommendation: `${numMains} Artisan Mains, ${numSecondary} Sharing Platters, ${numStarters} Starters, ${beverageItem ? `${numBeverages} Mocktails, ` : ''}& ${numDesserts} Desserts`,
        dishes: selectedDishes,
        availableMenuItems: items, // Return all restaurant items for custom swapping & adding
        estimatedTotal,
        perPersonCost,
        discountedTotal: Math.round(estimatedTotal * 0.85), // 15% bulk party discount
        savingsAmount: Math.round(estimatedTotal * 0.15)
      }
    });
  } catch (error) {
    next(error);
  }
};
