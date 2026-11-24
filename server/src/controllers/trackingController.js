const Order = require('../models/Order');
const PartnerLocation = require('../models/PartnerLocation');
const { calculateDistanceKm, calculateEtaMinutes } = require('../services/distanceService');
const { fetchRoadRoute } = require('../services/routingService');

// GET /api/orders/:id/tracking
exports.getOrderTracking = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name address location images phone prepTimeMins ownerId')
      .populate('partnerId', 'name phone partnerDetails')
      .populate('customerId', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role-based authorization check
    const isCustomer = req.user.role === 'customer' && order.customerId._id.toString() === req.user._id.toString();
    const isPartner = req.user.role === 'delivery_partner' && order.partnerId && order.partnerId._id.toString() === req.user._id.toString();
    const isRestaurant = req.user.role === 'restaurant' && order.restaurantId?.ownerId && order.restaurantId.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isPartner && !isRestaurant && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to track this order.' });
    }

    let partnerLiveLocation = null;
    let distanceToDeliveryKm = null;
    let liveEtaMins = null;

    if (order.status === 'delivered') {
      liveEtaMins = 0;
      distanceToDeliveryKm = 0;
      // When delivered, delivery partner has reached the customer drop-off location
      if (order.partnerId) {
        partnerLiveLocation = {
          coordinates: order.deliveryAddress.location.coordinates,
          heading: 0,
          speed: 0,
          isOnline: true,
          updatedAt: order.deliveredAt || new Date()
        };
      }
    } else if (order.partnerId) {
      const partnerLocDoc = await PartnerLocation.findOne({ partnerId: order.partnerId._id });
      if (partnerLocDoc) {
        partnerLiveLocation = {
          coordinates: partnerLocDoc.location.coordinates,
          heading: partnerLocDoc.heading,
          speed: partnerLocDoc.speed,
          isOnline: partnerLocDoc.isOnline,
          updatedAt: partnerLocDoc.updatedAt
        };

        // Distance from partner's live position to customer drop-off
        distanceToDeliveryKm = calculateDistanceKm(
          partnerLocDoc.location.coordinates,
          order.deliveryAddress.location.coordinates
        );
        liveEtaMins = Math.max(3, Math.round((distanceToDeliveryKm / 22) * 60));
      }
    }

    if (order.status !== 'delivered' && !liveEtaMins) {
      // Estimated default ETA
      const totalDist = calculateDistanceKm(
        order.restaurantId.location.coordinates,
        order.deliveryAddress.location.coordinates
      );
      liveEtaMins = calculateEtaMinutes(order.prepTimeMins || 20, totalDist);
    }

    // Compute realistic driving road polyline geometry
    let routeGeometry = null;
    // For delivered orders, the route connects the restaurant to the drop-off location
    const originCoords = order.status === 'delivered' 
      ? order.restaurantId.location.coordinates 
      : (partnerLiveLocation?.coordinates || order.restaurantId.location.coordinates);
    const destCoords = order.deliveryAddress.location.coordinates;

    if (originCoords && destCoords) {
      const roadRoute = await fetchRoadRoute(originCoords, destCoords);
      if (roadRoute) {
        routeGeometry = roadRoute.coordinates;
      }
    }

    res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveredAt: order.deliveredAt,
        statusHistory: order.statusHistory,
        amountBreakup: order.amountBreakup,
        paymentMode: order.paymentMode,
        paymentStatus: order.paymentStatus,
        deliveryOtp: order.deliveryOtp,
        createdAt: order.createdAt,
        items: order.items
      },
      restaurant: {
        _id: order.restaurantId._id,
        name: order.restaurantId.name,
        address: order.restaurantId.address,
        location: order.restaurantId.location,
        image: order.restaurantId.images.cover
      },
      deliveryAddress: order.deliveryAddress,
      partner: order.partnerId ? {
        _id: order.partnerId._id,
        name: order.partnerId.name,
        phone: order.partnerId.phone,
        vehicle: order.partnerId.partnerDetails,
        liveLocation: partnerLiveLocation
      } : null,
      etaMinutes: liveEtaMins,
      distanceKm: distanceToDeliveryKm,
      routeCoordinates: routeGeometry
    });
  } catch (error) {
    next(error);
  }
};
