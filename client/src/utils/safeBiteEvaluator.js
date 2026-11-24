/**
 * SafeBite Evaluation Utility
 * Compares an item's dietary tags & allergens against a user's dietary profile
 * Returns: { status: 'SAFE' | 'CONFLICT' | 'NEUTRAL', conflicts: string[], safeTags: string[] }
 */
export function evaluateSafeBite(item, profile) {
  if (!item || !profile) {
    return { status: 'NEUTRAL', conflicts: [], safeTags: [] };
  }

  const { isJain, isVegan, isPureVeg, isGlutenFree, isDiabeticFriendly, allergies = [] } = profile;

  const hasPreferences = isJain || isVegan || isPureVeg || isGlutenFree || isDiabeticFriendly || allergies.length > 0;
  if (!hasPreferences) {
    return { status: 'NEUTRAL', conflicts: [], safeTags: [] };
  }

  const itemTags = item.dietaryTags || [];
  const itemAllergens = item.allergens || [];
  const conflicts = [];
  const safeTags = [];

  // 1. Check allergies (Highest priority)
  allergies.forEach(allg => {
    if (itemAllergens.includes(allg)) {
      conflicts.push(`Contains ${formatAllergenName(allg)}`);
    }
  });

  // 2. Check Pure Veg
  if (isPureVeg && !item.isVeg) {
    conflicts.push('Non-Vegetarian Item');
  }

  // 3. Check Jain
  if (isJain) {
    if (!item.isVeg) conflicts.push('Non-Vegetarian Item');
    if (itemAllergens.includes('onion_garlic')) conflicts.push('Contains Onion/Garlic (Non-Jain)');
    if (itemTags.includes('jain')) safeTags.push('Jain Certified');
  }

  // 4. Check Vegan
  if (isVegan) {
    if (!item.isVeg) conflicts.push('Contains Meat/Animal Products');
    if (itemAllergens.includes('dairy') || itemAllergens.includes('eggs')) {
      conflicts.push('Contains Dairy or Eggs');
    }
    if (itemTags.includes('vegan')) safeTags.push('100% Plant-Based');
  }

  // 5. Check Gluten-Free
  if (isGlutenFree) {
    if (itemAllergens.includes('gluten')) conflicts.push('Contains Gluten / Wheat');
    if (itemTags.includes('gluten_free')) safeTags.push('Gluten Free');
  }

  // 6. Check Diabetic
  if (isDiabeticFriendly) {
    if (itemTags.includes('diabetic_friendly')) safeTags.push('Low Glycemic / Diabetic Safe');
  }

  if (conflicts.length > 0) {
    return {
      status: 'CONFLICT',
      conflicts,
      safeTags
    };
  }

  return {
    status: 'SAFE',
    conflicts: [],
    safeTags: safeTags.length > 0 ? safeTags : ['100% Safe For Your Profile']
  };
}

function formatAllergenName(id) {
  const map = {
    peanuts: 'Peanuts',
    tree_nuts: 'Tree Nuts',
    dairy: 'Dairy / Lactose',
    gluten: 'Gluten',
    onion_garlic: 'Onion & Garlic',
    soy: 'Soy',
    eggs: 'Eggs',
    shellfish: 'Shellfish',
    fish: 'Fish',
    mustard: 'Mustard',
    sesame: 'Sesame'
  };
  return map[id] || id;
}
