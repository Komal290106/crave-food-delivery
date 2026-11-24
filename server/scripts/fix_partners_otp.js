const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/crave_food_delivery').then(async () => {
  const PartnerLocation = mongoose.connection.collection('partnerlocations');
  const Order = mongoose.connection.collection('orders');

  // 1. Free ALL delivery partners
  const result = await PartnerLocation.updateMany({}, {
    $set: { activeOrderId: null, isOnline: true, isAvailable: true }
  });
  console.log('✅ Partners freed:', result.modifiedCount);

  // 2. Show all partners
  const partners = await PartnerLocation.find({}).toArray();
  partners.forEach(p => {
    console.log('  Partner:', p.partnerName || p.partnerId, '| Online:', p.isOnline, '| ActiveOrder:', p.activeOrderId);
  });

  // 3. Show all active orders with their OTPs
  const orders = await Order.find({
    status: { $in: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] }
  }).toArray();
  
  console.log('\n📋 Active Orders:');
  orders.forEach(o => {
    console.log('  Order:', o.orderNumber, '| Status:', o.status, '| OTP:', o.deliveryOtp, '| Customer:', o.deliveryAddress?.name || 'N/A');
  });

  if (orders.length === 0) {
    console.log('  No active orders found.');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}).catch(err => console.error('Error:', err));
