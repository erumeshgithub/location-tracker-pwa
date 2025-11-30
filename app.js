const { useState, useEffect, useRef } = React;
const { createRoot } = ReactDOM;

function LocationTrackerPWA() {
  const [position, setPosition] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [path, setPath] = useState([]);
  const [distance, setDistance] = useState(0);
  const [error, setError] = useState('');
  const watchIdRef = useRef(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => 
        console.log('SW registration failed:', err)
      );
    }
  }, []);

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setTracking(true);
    setPath([]);
    setDistance(0);
    setError('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Filter out inaccurate readings
        if (pos.coords.accuracy > 20) {
          console.log('Low accuracy, skipping');
          return;
        }

        const newPos = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          timestamp: Date.now()
        };
        
        setPosition(newPos);
        setPath(prev => {
          const newPath = [...prev, newPos];
          
          if (prev.length > 0) {
            const lastPos = prev[prev.length - 1];
            const timeDiff = (newPos.timestamp - lastPos.timestamp) / 1000;
            
            // Use GPS speed if available and moving
            if (newPos.speed !== null && newPos.speed > 0.5) {
              const distFromSpeed = newPos.speed * timeDiff;
              setDistance(prevDist => prevDist + distFromSpeed);
            } else {
              // Otherwise calculate distance, but filter GPS noise
              const dist = haversineDistance(lastPos.lat, lastPos.lon, newPos.lat, newPos.lon);
              const MIN_DISTANCE = 5; // Only count movements over 5 meters
              
              if (dist >= MIN_DISTANCE) {
                setDistance(prevDist => prevDist + dist);
              }
            }
          }
          
          return newPath;
        });
      },
      (err) => setError(`Error: ${err.message}`),
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">📍 Location Tracker PWA</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4 mb-6">
            {!tracking ? (
              <button
                onClick={startTracking}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
              >
                ▶️ Start Tracking
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
              >
                ⏹️ Stop Tracking
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Distance</div>
              <div className="text-2xl font-bold text-blue-600">
                {(distance / 1000).toFixed(3)} km
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {distance.toFixed(1)} meters
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Points</div>
              <div className="text-2xl font-bold text-purple-600">
                {path.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                GPS readings
              </div>
            </div>
          </div>

          {position && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Current Position</div>
              <div className="font-mono text-sm space-y-1">
                <div>Latitude: {position.lat.toFixed(6)}°</div>
                <div>Longitude: {position.lon.toFixed(6)}°</div>
                <div>Accuracy: ±{position.accuracy?.toFixed(1)} m</div>
                {position.speed !== null && (
                  <div>Speed: {(position.speed * 3.6).toFixed(1)} km/h</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<LocationTrackerPWA />);
