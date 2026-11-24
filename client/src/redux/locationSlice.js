import { createSlice } from '@reduxjs/toolkit';

const getInitialLocation = () => {
  try {
    const saved = localStorage.getItem('crave_selected_location');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-correct stale or mismatched Nurpur/Delhi entries
      if (
        parsed.city?.toLowerCase().includes('nurpur') ||
        (parsed.pincode?.startsWith('110') && parsed.city !== 'New Delhi')
      ) {
        return {
          label: 'Connaught Place, New Delhi (Demo Cluster)',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          addressLine: 'Connaught Place Inner Circle',
          coordinates: [77.2205, 28.6328],
          isDemoCluster: true,
          source: 'demo_cluster'
        };
      }
      return parsed;
    }
  } catch (e) {
    // ignore
  }

  return {
    label: 'Connaught Place, New Delhi (Demo Cluster)',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    addressLine: 'Connaught Place Inner Circle',
    coordinates: [77.2205, 28.6328], // [longitude, latitude]
    isDemoCluster: true,
    source: 'demo_cluster' // 'saved_address' | 'manual_entry' | 'browser_gps' | 'demo_cluster'
  };
};

const locationSlice = createSlice({
  name: 'location',
  initialState: getInitialLocation(),
  reducers: {
    setLocation: (state, action) => {
      const payload = { ...action.payload };
      // Sanitize mismatched Nurpur or detected device location when Delhi pin is used
      if (
        payload.pincode?.startsWith('110') &&
        (payload.city?.toLowerCase().includes('nurpur') || !payload.city || payload.city === 'Detected Device Location')
      ) {
        payload.city = 'New Delhi';
        payload.label = 'Connaught Place (110001)';
        payload.addressLine = payload.addressLine && !payload.addressLine.includes('Nurpur') 
          ? payload.addressLine 
          : 'Connaught Place Inner Circle';
        payload.coordinates = [77.2205, 28.6328];
        payload.isDemoCluster = true;
      }

      const updated = {
        ...state,
        ...payload,
        isDemoCluster: payload.isDemoCluster ?? false
      };
      try {
        localStorage.setItem('crave_selected_location', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    },
    resetToDemoCluster: () => {
      const demoState = {
        label: 'Connaught Place, New Delhi (Demo Cluster)',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        addressLine: 'Connaught Place Inner Circle',
        coordinates: [77.2205, 28.6328],
        isDemoCluster: true,
        source: 'demo_cluster'
      };
      try {
        localStorage.setItem('crave_selected_location', JSON.stringify(demoState));
      } catch (e) {
        // ignore
      }
      return demoState;
    }
  }
});

export const { setLocation, resetToDemoCluster } = locationSlice.actions;
export default locationSlice.reducer;
