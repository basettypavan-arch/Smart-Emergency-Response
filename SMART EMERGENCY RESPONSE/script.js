const SESSION_KEY = 'smartEmergencyUser';
const USERS_KEY = 'smartEmergencyUsers';
const SIGNUP_SUCCESS_KEY = 'smartEmergencySignupMessage';
const SOS_EVENTS_KEY = 'smartEmergencySosEvents';
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
const VILLAGE_CENTER = { lat: 12.34, lng: 77.56 };

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

let db = null;
let firebaseSyncReady = false;

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => typeof value === 'string' && value && !value.includes('YOUR_'));
}

function initFirebaseSync() {
  if (!hasFirebaseConfig() || typeof firebase === 'undefined' || !firebase.firestore) {
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseSyncReady = true;
    subscribeToSosEvents();
  } catch (error) {
    console.warn('Firebase initialization failed, using local storage fallback.', error);
    firebaseSyncReady = false;
  }
}

const loginForm = document.getElementById('adminLoginForm');
const adminUsername = document.getElementById('adminUsername');
const adminPassword = document.getElementById('adminPassword');
const loginMessage = document.getElementById('loginMessage');
const togglePassword = document.getElementById('togglePassword');
const rememberMe = document.getElementById('rememberMe');
const signupForm = document.getElementById('adminSignupForm');
const signupTogglePassword = document.getElementById('signupTogglePassword');

function getStoredUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function isAdminLoggedIn() {
  return Boolean(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY));
}

function redirectIfNeeded() {
  const currentPage = window.location.pathname.split('/').pop().toLowerCase();

  if (currentPage === 'dashboard.html') {
    document.body.classList.add('logged-in');
    if (!isAdminLoggedIn()) {
      window.location.href = 'index.html';
    }
    return;
  }

  document.body.classList.remove('logged-in');

  if (currentPage === 'index.html' && loginMessage) {
    const successMessage = localStorage.getItem(SIGNUP_SUCCESS_KEY);
    if (successMessage) {
      loginMessage.textContent = successMessage;
      loginMessage.className = 'login-message success';
      localStorage.removeItem(SIGNUP_SUCCESS_KEY);
    } else {
      loginMessage.textContent = 'Welcome back.';
      loginMessage.className = 'login-message';
    }
  }

  if (['index.html', 'signup.html'].includes(currentPage) && isAdminLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
}

redirectIfNeeded();

function matchesAdminCredentials(username, password) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const plainPassword = String(password || '');

  if (normalizedUsername === 'admin' && plainPassword === 'admin123') {
    return true;
  }

  const users = getStoredUsers();
  return users.some((user) => {
    const savedUser = String(user.username || '').trim().toLowerCase();
    const savedPassword = String(user.password || '');
    return savedUser === normalizedUsername && savedPassword === plainPassword && user.role === 'admin';
  });
}

function storeSession(keepSignedIn) {
  if (keepSignedIn) {
    localStorage.setItem(SESSION_KEY, 'admin');
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, 'admin');
    localStorage.removeItem(SESSION_KEY);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = adminUsername?.value.trim() || '';
    const password = adminPassword?.value.trim() || '';

    if (!matchesAdminCredentials(username, password)) {
      if (loginMessage) {
        loginMessage.textContent = 'Incorrect credentials. Please try again.';
        loginMessage.className = 'login-message error';
      }
      return;
    }

    storeSession(Boolean(rememberMe?.checked));
    if (loginMessage) {
      loginMessage.textContent = 'Access granted. Redirecting to the dashboard...';
      loginMessage.className = 'login-message success';
    }

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  });
}

if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    const isPassword = adminPassword.type === 'password';
    adminPassword.type = isPassword ? 'text' : 'password';
    togglePassword.textContent = isPassword ? 'Hide' : 'Show';
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    const username = document.getElementById('signupUsername')?.value.trim() || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirmPassword = document.getElementById('signupConfirmPassword')?.value || '';
    const message = document.getElementById('signupMessage');

    if (!fullName || !email || !username || !password || !confirmPassword) {
      if (message) {
        message.textContent = 'Please complete all fields.';
        message.className = 'login-message error';
      }
      return;
    }

    if (password.length < 6) {
      if (message) {
        message.textContent = 'Password must be at least 6 characters.';
        message.className = 'login-message error';
      }
      return;
    }

    if (password !== confirmPassword) {
      if (message) {
        message.textContent = 'Passwords do not match.';
        message.className = 'login-message error';
      }
      return;
    }

    const users = getStoredUsers();
    const exists = users.some((user) => String(user.username || '').trim().toLowerCase() === username.toLowerCase());

    if (exists) {
      if (message) {
        message.textContent = 'This admin username already exists.';
        message.className = 'login-message error';
      }
      return;
    }

    users.push({
      fullName,
      email,
      username,
      password,
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    saveStoredUsers(users);

    if (message) {
      message.textContent = 'Account created successfully. Redirecting to login...';
      message.className = 'login-message success';
    }

    localStorage.setItem(SIGNUP_SUCCESS_KEY, 'Account created successfully. Please sign in.');

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 700);
  });
}

if (signupTogglePassword) {
  signupTogglePassword.addEventListener('click', () => {
    const passwordField = document.getElementById('signupPassword');
    const isPassword = passwordField.type === 'password';
    passwordField.type = isPassword ? 'text' : 'password';
    signupTogglePassword.textContent = isPassword ? 'Hide' : 'Show';
  });
}

const statusText = document.getElementById('statusText');
const sosButton = document.getElementById('sosButton');
const relayButton = document.getElementById('relayButton');
const quickHelpBtn = document.getElementById('quickHelpBtn');
const appRelayBtn = document.getElementById('appRelayBtn');
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');
const themeToggle = document.getElementById('themeToggle');
const logoutButton = document.getElementById('logoutButton');
const alertBanner = document.getElementById('alertBanner');
const liveClock = document.getElementById('liveClock');
const liveLocation = document.getElementById('liveLocation');
const checklistProgress = document.getElementById('checklistProgress');
const checklistBar = document.getElementById('checklistBar');
const checklistItems = document.querySelectorAll('.check-item input');
const landingBannerText = document.querySelector('.landing-banner div span');
const sosFeed = document.getElementById('sosFeed');
const googleMap = document.getElementById('googleMap');
const liveLocationButton = document.getElementById('liveLocationButton');
const destinationSelect = document.getElementById('destinationSelect');
const directionsButton = document.getElementById('directionsButton');
const mapStatus = document.getElementById('mapStatus');

let emergencyMap;
let directionsService;
let directionsRenderer;
let userLocationMarker;
let currentOrigin = VILLAGE_CENTER;
let hasLiveLocation = false;
let routeRequested = false;
let googleMapsRequested = false;
let placesService;
let nearbyPlaceMarkers = [];
let lastNearbySearchLocation;

function setNearbyDestinations(places) {
  if (!hasLiveLocation) return;

  places.forEach((place) => {
    const latitude = place.geometry.location.lat();
    const longitude = place.geometry.location.lng();
    const marker = nearbyPlaceMarkers.find((item) => item.placeId === place.place_id);
    marker?.addListener('click', () => {
      const url = new URL('https://www.google.com/maps/dir/');
      url.searchParams.set('api', '1');
      url.searchParams.set('origin', `${currentOrigin.lat},${currentOrigin.lng}`);
      url.searchParams.set('destination', `${latitude},${longitude}`);
      url.searchParams.set('travelmode', 'driving');
      window.location.assign(url.toString());
    });
  });
}

function searchNearbyPlaces() {
  if (!placesService || !hasLiveLocation) return;

  if (lastNearbySearchLocation) {
    const latitudeDelta = Math.abs(lastNearbySearchLocation.lat - currentOrigin.lat);
    const longitudeDelta = Math.abs(lastNearbySearchLocation.lng - currentOrigin.lng);
    if (latitudeDelta < 0.001 && longitudeDelta < 0.001) return;
  }
  lastNearbySearchLocation = { ...currentOrigin };

  const searches = [
    { keyword: 'emergency shelter', type: undefined },
    { type: 'hospital' },
    { type: 'police' }
  ];
  const results = [];
  let completed = 0;

  searches.forEach((search) => {
    const request = {
      location: currentOrigin,
      radius: 5000
    };
    if (search.type) request.type = search.type;
    if (search.keyword) request.keyword = search.keyword;

    placesService.nearbySearch(request, (places, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && places) {
        results.push(...places);
      }
      completed += 1;
      if (completed !== searches.length) return;

      const uniquePlaces = Array.from(new Map(results.map((place) => [place.place_id, place])).values());
      nearbyPlaceMarkers.forEach((marker) => marker.setMap(null));
      nearbyPlaceMarkers = uniquePlaces.map((place) => {
        const marker = new google.maps.Marker({
          map: emergencyMap,
          position: place.geometry.location,
          title: `${place.name} - click for directions`
        });
        marker.placeId = place.place_id;
        return marker;
      });
      setNearbyDestinations(uniquePlaces);
      if (mapStatus) {
        mapStatus.textContent = uniquePlaces.length
          ? `${uniquePlaces.length} nearby shelters, hospitals, and police stations found.`
          : 'No nearby services found within 5 km.';
      }
    });
  });
}

function hasGoogleMapsKey() {
  return GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.includes('YOUR_');
}

function loadGoogleMaps() {
  if (!googleMap || !hasGoogleMapsKey() || googleMapsRequested) return;
  googleMapsRequested = true;

  window.initEmergencyMap = () => {
    emergencyMap = new google.maps.Map(googleMap, {
      center: VILLAGE_CENTER,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map: emergencyMap });
    placesService = new google.maps.places.PlacesService(emergencyMap);
    userLocationMarker = new google.maps.Marker({
      map: emergencyMap,
      position: currentOrigin,
      title: 'Your live location',
      label: 'You'
    });
    emergencyMap.setCenter(currentOrigin);
    document.querySelector('.map-surface')?.classList.add('google-map-ready');
    if (mapStatus) mapStatus.textContent = hasLiveLocation
      ? 'Live location ready. Choose a destination for directions.'
      : 'Google Maps is connected. Allow location access for a live route.';
    searchNearbyPlaces();
  };

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places&callback=initEmergencyMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    if (mapStatus) mapStatus.textContent = 'Google Maps could not load. Use the directions button to open Maps.';
  };
  document.head.appendChild(script);
}

function getRouteDestination() {
  const [name, coordinates] = (destinationSelect?.value || '').split('|');
  const [lat, lng] = (coordinates || '').split(',').map(Number);
  return { name, location: { lat, lng } };
}

function openGoogleDirections() {
  const destination = getRouteDestination();
  const origin = `${currentOrigin.lat},${currentOrigin.lng}`;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', `${destination.location.lat},${destination.location.lng}`);
  url.searchParams.set('travelmode', 'driving');
  window.location.assign(url.toString());
}

function showRoute() {
  const destination = getRouteDestination();
  if (!destination.name || !destination.location.lat || !destination.location.lng) {
    if (mapStatus) mapStatus.textContent = 'Choose a destination before requesting directions.';
    return;
  }
  routeRequested = true;

  if (directionsService && directionsRenderer) {
    directionsService.route({
      origin: currentOrigin,
      destination: destination.location,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        if (mapStatus) mapStatus.textContent = `Route to ${destination.name} is ready.`;
      } else if (mapStatus) {
        mapStatus.textContent = 'Route preview failed. Open Google Maps for directions.';
      }
    });
    return;
  }

  if (mapStatus) mapStatus.textContent = `Opening directions to ${destination.name} in Google Maps.`;
  openGoogleDirections();
}

function updateLiveLocation(position) {
  currentOrigin = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };
  hasLiveLocation = true;
  loadGoogleMaps();

  if (liveLocation) liveLocation.textContent = `Location: ${currentOrigin.lat.toFixed(5)}, ${currentOrigin.lng.toFixed(5)}`;
  if (liveLocationButton) {
    liveLocationButton.textContent = `📍 ${currentOrigin.lat.toFixed(5)}, ${currentOrigin.lng.toFixed(5)}`;
    liveLocationButton.setAttribute('aria-label', `Your current location is ${currentOrigin.lat.toFixed(5)}, ${currentOrigin.lng.toFixed(5)}`);
  }
  if (userLocationMarker) userLocationMarker.setPosition(currentOrigin);
  if (emergencyMap) emergencyMap.setCenter(currentOrigin);
  if (placesService) searchNearbyPlaces();
  if (mapStatus && !routeRequested) {
    mapStatus.textContent = `Current location: ${currentOrigin.lat.toFixed(5)}, ${currentOrigin.lng.toFixed(5)}. Choose a destination for directions.`;
  }
  if (routeRequested && directionsService && directionsRenderer) showRoute();
}

function handleLocationError() {
  if (liveLocationButton) {
    liveLocationButton.textContent = '📍 Location unavailable - try again';
    liveLocationButton.setAttribute('aria-label', 'Location unavailable. Click to try again');
  }
  if (mapStatus) mapStatus.textContent = 'Location access is unavailable. Please allow GPS access and try again.';
}

function openCurrentLocationInGoogleMaps(locationWindow, location = currentOrigin) {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', `${location.lat},${location.lng}`);

  if (locationWindow && !locationWindow.closed) {
    locationWindow.location.href = url.toString();
  } else {
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }
}

function requestLiveLocation(openGoogleMaps = false) {
  if (!navigator.geolocation) {
    if (mapStatus) mapStatus.textContent = 'Live location is not supported by this browser.';
    return;
  }

  const hadLiveLocation = hasLiveLocation;
  if (openGoogleMaps && hadLiveLocation) openCurrentLocationInGoogleMaps(null);

  if (hasLiveLocation && mapStatus) {
    mapStatus.textContent = `Current location: ${currentOrigin.lat.toFixed(5)}, ${currentOrigin.lng.toFixed(5)}. Choose a destination for directions.`;
  } else if (mapStatus) {
    mapStatus.textContent = 'Finding your current location...';
  }
  if (liveLocationButton && !hasLiveLocation) {
    liveLocationButton.textContent = '📍 Locating you...';
    liveLocationButton.setAttribute('aria-label', 'Finding your current location');
  }
  navigator.geolocation.getCurrentPosition((position) => {
    updateLiveLocation(position);
    if (openGoogleMaps && !hadLiveLocation) openCurrentLocationInGoogleMaps(null, currentOrigin);
  }, handleLocationError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000
  });
}

directionsButton?.addEventListener('click', showRoute);
liveLocationButton?.addEventListener('click', () => requestLiveLocation(true));

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(updateLiveLocation, handleLocationError, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 15000
  });
} else if (mapStatus) {
  mapStatus.textContent = 'Live location is not supported. Using Village Center for directions.';
}

function getSosEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(SOS_EVENTS_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveSosEvents(events) {
  localStorage.setItem(SOS_EVENTS_KEY, JSON.stringify(events));
}

function renderSosEvents(events = getSosEvents()) {
  if (!sosFeed) return;

  if (!events.length) {
    sosFeed.innerHTML = `
      <div class="incident-card warning">
        <div>
          <strong>No SOS alerts yet</strong>
          <p>When a user presses the SOS button, it will appear here with the time.</p>
        </div>
        <span>Waiting</span>
      </div>
    `;
    return;
  }

  sosFeed.innerHTML = events
    .slice()
    .reverse()
    .map((event) => {
      const timestamp = event.timestamp || Date.now();
      const time = new Date(timestamp).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      return `
        <div class="incident-card danger">
          <div>
            <strong>${event.title || 'SOS emergency alert'}</strong>
            <p>${event.message || 'Emergency request triggered from the app.'}</p>
          </div>
          <span>${time}</span>
        </div>
      `;
    })
    .join('');
}

function subscribeToSosEvents() {
  if (!db || !firebaseSyncReady) return;

  db.collection('sos_events')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .onSnapshot((snapshot) => {
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (events.length) {
        saveSosEvents(events);
      }

      renderSosEvents(events);
    }, (error) => {
      console.warn('Failed to subscribe to Firebase SOS events.', error);
    });
}

function addSosEvent() {
  const payload = {
    title: 'SOS emergency triggered',
    message: 'Village user pressed the SOS button. A rescue team should respond immediately.',
    timestamp: new Date().toISOString(),
    location: 'Village Center'
  };

  if (db && firebaseSyncReady) {
    db.collection('sos_events').add(payload).catch((error) => {
      console.warn('Failed to save SOS event to Firebase, falling back to local storage.', error);
      const events = getSosEvents();
      events.push(payload);
      if (events.length > 10) events.splice(0, events.length - 10);
      saveSosEvents(events);
      renderSosEvents(events);
    });
    return;
  }

  const events = getSosEvents();
  events.push(payload);
  if (events.length > 10) events.splice(0, events.length - 10);
  saveSosEvents(events);
  renderSosEvents(events);
}

function activateSos() {
  addSosEvent();

  if (statusText) statusText.textContent = 'SOS alert sent to nearby responders.';
  if (sosButton) {
    sosButton.textContent = 'SOS Sent ✓';
    setTimeout(() => {
      sosButton.textContent = 'Trigger SOS Alert';
    }, 2000);
  }
  if (quickHelpBtn) {
    quickHelpBtn.textContent = '⚡ Help Sent';
    setTimeout(() => {
      quickHelpBtn.textContent = '⚡ Quick Help';
    }, 2000);
  }
}

function activateRelay() {
  if (statusText) statusText.textContent = 'Relay message broadcast across the village network.';
  if (relayButton) {
    relayButton.textContent = 'Message Sent ✓';
    setTimeout(() => {
      relayButton.textContent = 'Send Relay Message';
    }, 2000);
  }
  if (appRelayBtn) {
    appRelayBtn.textContent = '📡 Relayed';
    setTimeout(() => {
      appRelayBtn.textContent = '📡 Relay';
    }, 2000);
  }
}

sosButton?.addEventListener('click', activateSos);
quickHelpBtn?.addEventListener('click', activateSos);
relayButton?.addEventListener('click', activateRelay);
appRelayBtn?.addEventListener('click', activateRelay);

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  formMessage.textContent = 'Your request has been received. Help team will contact you soon.';
  contactForm.reset();
});

themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const dark = document.body.classList.contains('dark-theme');
  themeToggle.textContent = dark ? '☀️ Light' : '🌙 Dark';
});

logoutButton?.addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
});

document.querySelectorAll('.ack-btn').forEach((button) => {
  button.addEventListener('click', () => {
    button.textContent = 'Done';
    button.classList.add('done');
  });
});

setInterval(() => {
  if (alertBanner) {
    alertBanner.style.background = alertBanner.style.background === 'rgba(255, 255, 255, 0.16)' ? 'rgba(248, 113, 113, 0.24)' : 'rgba(255, 255, 255, 0.16)';
  }
}, 1200);

function updateClock() {
  const now = new Date();
  if (liveClock) liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (liveLocation && !hasLiveLocation) liveLocation.textContent = 'Location: Waiting for GPS';
}

updateClock();
setInterval(updateClock, 1000);

function updateChecklist() {
  const checkedCount = Array.from(checklistItems).filter((item) => item.checked).length;
  const totalCount = checklistItems.length;
  const progressPercent = (checkedCount / totalCount) * 100;

  if (checklistProgress) checklistProgress.textContent = `${checkedCount}/${totalCount} done`;
  if (checklistBar) checklistBar.style.width = `${progressPercent}%`;
}

checklistItems.forEach((item) => item.addEventListener('change', updateChecklist));
updateChecklist();

const landingMessages = [
  'Emergency systems are fully active. Watch the admin portal come alive.',
  'Flood watch mode engaged — nearby shelter routes are highlighted.',
  'Volunteer teams online: 12 responders ready for immediate dispatch.',
  'Village alert network is live — stay connected and stay safe.'
];
let currentLandingMessage = 0;

function rotateLandingBanner() {
  if (!landingBannerText) return;
  landingBannerText.classList.add('fade-out');
  setTimeout(() => {
    currentLandingMessage = (currentLandingMessage + 1) % landingMessages.length;
    landingBannerText.textContent = landingMessages[currentLandingMessage];
    landingBannerText.classList.remove('fade-out');
  }, 420);
}

setInterval(rotateLandingBanner, 4200);

function filterCategory(category) {
  const blocks = document.querySelectorAll('.category-block');
  if (!blocks.length) return;
  if (!category || category === 'all') {
    blocks.forEach((b) => b.classList.remove('hidden'));
    return;
  }
  blocks.forEach((b) => {
    const cat = b.getAttribute('data-category');
    if (cat === category) b.classList.remove('hidden');
    else b.classList.add('hidden');
  });
}

document.querySelectorAll('.module-category-pill, .category-pill').forEach((el) => {
  el.addEventListener('click', () => {
    const txt = (el.textContent || el.innerText).trim().toLowerCase();
    let cat = txt;
    if (cat.includes('safety') || cat.includes('emergency')) cat = 'emergency';
    if (cat.includes('comm')) cat = 'communication';
    if (cat.includes('nav') || cat.includes('shelter')) cat = 'navigation';
    filterCategory(cat);
  });
});

document.querySelectorAll('[data-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = btn.getAttribute('data-filter');
    filterCategory(f);
  });
});

const activeQuickFilters = new Set();
document.querySelectorAll('.quick-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = btn.getAttribute('data-filter');
    const wasPressed = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', wasPressed ? 'false' : 'true');
    if (wasPressed) activeQuickFilters.delete(f);
    else activeQuickFilters.add(f);

    const filters = Array.from(activeQuickFilters);
    if (filters.length === 0) {
      filterCategory('all');
      return;
    }

    const blocks = document.querySelectorAll('.category-block');
    blocks.forEach((b) => {
      const cat = b.getAttribute('data-category');
      if (filters.includes(cat)) b.classList.remove('hidden');
      else b.classList.add('hidden');
    });
  });
});

(() => {
  const modal = document.getElementById('galleryModal');
  if (!modal) return;
  const modalImg = modal.querySelector('.modal-content img');
  const modalCaption = modal.querySelector('.modal-caption');
  const closeBtn = modal.querySelector('.modal-close');
  const prevBtn = modal.querySelector('.modal-prev');
  const nextBtn = modal.querySelector('.modal-next');
  const backdrop = modal.querySelector('.gallery-backdrop');

  const items = Array.from(document.querySelectorAll('.response-item')).map((el) => {
    const img = el.querySelector('img');
    const caption = el.querySelector('.caption')?.innerText || '';
    return { src: img?.src || '', alt: img?.alt || '', caption };
  });

  let currentIndex = 0;

  function showIndex(i) {
    if (!items.length) return;
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    currentIndex = i;
    const item = items[currentIndex];
    modalImg.src = item.src;
    modalImg.alt = item.alt;
    modalCaption.textContent = item.caption;
  }

  function openGallery(index) {
    showIndex(index || 0);
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }

  function closeGallery() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modalImg.src = '';
  }

  document.querySelectorAll('.gallery-open').forEach((img, index) => {
    img.addEventListener('click', () => {
      openGallery(Number(img.closest('.response-item')?.dataset.index ?? index));
    });
  });

  closeBtn?.addEventListener('click', closeGallery);
  backdrop?.addEventListener('click', closeGallery);
  prevBtn?.addEventListener('click', () => showIndex(currentIndex - 1));
  nextBtn?.addEventListener('click', () => showIndex(currentIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (modal.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowLeft') showIndex(currentIndex - 1);
      if (e.key === 'ArrowRight') showIndex(currentIndex + 1);
    }
  });
})();
