import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/LogisticsMap.css';

const LogisticsMap = () => {
  const [params] = useSearchParams();
  const lat = parseFloat(params.get('lat'));
  const lon = parseFloat(params.get('lon'));
  const name = decodeURIComponent(params.get('name') || 'Farmer');

  useEffect(() => {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      console.error("Invalid map coordinates");
      return;
    }

    // Destroy existing map if it exists
    const existingMap = document.getElementById('map');
    if (existingMap && existingMap._leaflet_id) {
      existingMap._leaflet_id = null;
    }

    const map = L.map('map').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`Pickup Location: ${name}`)
      .openPopup();

    // Optional: Clean up on unmount
    return () => {
      map.remove();
    };
  }, [lat, lon, name]);

    return (
      <div className="map-container">
        <h2 className="map-header">
          Pickup Location for <em>{name}</em>
        </h2>

        <div style={{ textAlign: 'center' }}>
          <a
            href={`https://www.google.com/maps?q=${lat},${lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="navigate-button"
          >
            📍 Navigate with Google Maps
          </a>
        </div>

        <div id="map"></div>
      </div>
    );

    };

export default LogisticsMap;