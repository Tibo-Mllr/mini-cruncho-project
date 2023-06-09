import { ReactElement, useEffect } from 'react';
import { CustomPlace } from '../utils';

type MapProps = {
  dispatch: (action: {
    type: 'addPair' | 'reset' | 'setMap' | 'setInfoWindow';
    place?: CustomPlace;
    marker?: google.maps.Marker;
    map?: google.maps.Map;
    infoWindow?: google.maps.InfoWindow;
  }) => void;
  setSelectedPlace: (selectedPlace: CustomPlace) => void;
  setFinished: (finished: boolean) => void;
};

export default function Map({ dispatch, setSelectedPlace, setFinished }: MapProps): ReactElement {
  let map: google.maps.Map;
  let infoWindow: google.maps.InfoWindow;
  let pos: { lat: number; lng: number };
  let request: { location: { lat: number; lng: number }; radius: number; query: string };
  let service: google.maps.places.PlacesService;
  let radius = 50;
  let home: google.maps.Marker;

  useEffect(() => {
    initMap();
  }, []);

  function initMap(): void {
    map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
      zoom: 15,
    });
    dispatch({ type: 'setMap', map: map });

    infoWindow = new google.maps.InfoWindow();
    dispatch({ type: 'setInfoWindow', infoWindow: infoWindow });

    getLocation();
  }

  function getLocation(): void {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        home = new google.maps.Marker({
          position: pos,
          map: map,
          icon: 'http://maps.google.com/mapfiles/ms/micons/blue.png',
        });
        map.setCenter(pos);
        getNearByPlaces(pos);
      });
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter() as google.maps.LatLng);
    }

    infoWindow = new google.maps.InfoWindow();
  }

  function getNearByPlaces(pos: { lat: number; lng: number }): void {
    request = {
      location: pos,
      radius: radius,
      query: 'restaurant',
    };

    service = new google.maps.places.PlacesService(map);
    service.textSearch(request, callback);
  }

  function callback(
    results: google.maps.places.PlaceResult[] | null,
    status: google.maps.places.PlacesServiceStatus,
  ): void {
    if (status == google.maps.places.PlacesServiceStatus.OK && results && results.length >= 10) {
      const bounds = new google.maps.LatLngBounds();
      for (let i = 0; i < 10; i++) {
        const mark = createMarker(results[i]);
        bounds.extend(mark.getPosition() as google.maps.LatLng);
      }
      map.fitBounds(bounds);
      setFinished(true);
    } else {
      radius = radius * 1.1;
      getNearByPlaces(pos);
    }
  }

  function handleLocationError(
    browserHasGeolocation: boolean,
    infoWindow: google.maps.InfoWindow,
    pos: google.maps.LatLng,
  ): void {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
      browserHasGeolocation
        ? 'Error: The Geolocation service failed.'
        : "Error: Your browser doesn't support geolocation.",
    );
    infoWindow.open(map);
  }

  function createMarker(place: google.maps.places.PlaceResult): google.maps.Marker {
    const marker = new google.maps.Marker({
      map: map,
      position: (place.geometry as google.maps.places.PlaceGeometry).location,
    });

    const homePos = home.getPosition() as google.maps.LatLng;
    const markerPos = marker.getPosition() as google.maps.LatLng;
    const R = 6371; // Radius of the Earth in km
    const rlat1 = homePos.lat() * (Math.PI / 180); // Convert degrees to radians
    const rlat2 = markerPos.lat() * (Math.PI / 180); // Convert degrees to radians
    const difflat = rlat2 - rlat1; // Radian difference (latitudes)
    const difflon = (homePos.lng() - markerPos.lng()) * (Math.PI / 180); // Radian difference (longitudes)

    const d =
      2 *
      R *
      Math.asin(
        Math.sqrt(
          Math.sin(difflat / 2) * Math.sin(difflat / 2) +
            Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2),
        ),
      );

    dispatch({ type: 'addPair', place: { ...place, distance: d }, marker: marker });

    google.maps.event.addListener(marker, 'click', () => {
      setSelectedPlace({ ...place, distance: d });

      infoWindow.setContent(place.name + ' - ' + d.toFixed(2) + ' km from your location');
      infoWindow.open(map, marker);
    });
    return marker;
  }

  return <div id="map" className="map-container"></div>;
}
