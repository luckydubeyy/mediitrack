// --- 1. PERSISTENT STORAGE & SEED DATA ---
const DB_KEY = 'meditrack_db_v2';

const defaultDB = {
  users: [
    {
      id: 'pat_1',
      role: 'patient',
      name: 'Alex Morgan',
      email: 'patient@demo.com',
      password: 'password', // set below
      age: 32,
      gender: 'Male',
      height: 176,
      weight: 74,
      bloodGroup: 'O+',
      phone: '+91 98230 11223',
      emergencyContact: 'Sarah Morgan (+91 98230 44556)',
      address: 'Baner, Pune',
      allergies: 'Penicillin',
      conditions: 'Mild Asthma',
      records: [
        {
          id: 'rec_1',
          type: 'history',
          date: '2026-08-14',
          title: 'Mild Intermittent Asthma',
          notes: 'Diagnosed in 2022. Triggered by dust and cold air.',
          doctor: 'Self / Previous Clinic'
        }
      ]
    },
    {
      id: 'doc_1',
      role: 'doctor',
      name: 'Dr. Priya Nair',
      email: 'doctor@demo.com',
      password: 'password',
      specialty: 'General Medicine'
    }
  ]
};
defaultDB.users[0].password = '123456';
defaultDB.users[1].password = '123456';

function getDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDB));
    return structuredClone(defaultDB);
  }
  return JSON.parse(raw);
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function calculateBMI(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0) return 'N/A';
  const bmi = (w / ((h / 100) * (h / 100))).toFixed(1);
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 25 && bmi < 30) category = 'Overweight';
  else if (bmi >= 30) category = 'Obese';
  return `${bmi} (${category})`;
}

let currentUser = null;
let selectedPatientId = null;
let mapInstance = null;

// --- 2. AUTHENTICATION & REGISTRATION ---
function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function toggleDoctorFields() {
  const role = document.getElementById('reg-role').value;
  document.getElementById('patient-reg-fields').classList.toggle('hidden', role === 'doctor');
  document.getElementById('doctor-reg-fields').classList.toggle('hidden', role !== 'doctor');
}

function handleRegister(e) {
  e.preventDefault();
  const db = getDB();
  const role = document.getElementById('reg-role').value;
  const email = document.getElementById('reg-email').value.trim().toLowerCase();

  if (db.users.some(u => u.email === email)) {
    alert('An account with this email already exists. Please switch to Login.');
    return;
  }

  const newUser = {
    id: `${role === 'patient' ? 'pat' : 'doc'}_${Date.now()}`,
    role,
    name: document.getElementById('reg-name').value.trim(),
    email,
    password: document.getElementById('reg-password').value
  };

  if (role === 'patient') {
    const cond = document.getElementById('reg-conditions').value.trim();
    const allergies = document.getElementById('reg-allergies').value.trim();
    newUser.age = document.getElementById('reg-age').value || 'Not set';
    newUser.gender = document.getElementById('reg-gender').value;
    newUser.height = document.getElementById('reg-height').value || 'Not set';
    newUser.weight = document.getElementById('reg-weight').value || 'Not set';
    newUser.bloodGroup = document.getElementById('reg-blood').value;
    newUser.phone = document.getElementById('reg-phone').value.trim() || 'Not provided';
    newUser.emergencyContact = document.getElementById('reg-emergency').value.trim() || 'Not provided';
    newUser.address = document.getElementById('reg-address').value.trim() || 'Not provided';
    newUser.allergies = allergies || 'None reported';
    newUser.conditions = cond || 'None reported';
    newUser.records = cond
      ? [{
          id: `rec_${Date.now()}`,
          type: 'history',
          date: new Date().toISOString().split('T')[0],
          title: 'Initial Medical History',
          notes: cond,
          doctor: 'Patient Registration'
        }]
      : [];
  } else {
    newUser.specialty = document.getElementById('reg-specialty').value.trim() || 'General Practitioner';
  }

  db.users.push(newUser);
  saveDB(db);
  currentUser = newUser;
  alert(`Account created for ${newUser.name}! You can log back in anytime with ${newUser.email}.`);
  launchDashboard();
}

function handleLogin(e) {
  e.preventDefault();
  const db = getDB();
  const role = document.getElementById('login-role').value;
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const user = db.users.find(u => u.role === role && u.email === email && u.password === password);
  if (!user) {
    alert('Invalid email, password, or role selected.');
    return;
  }
  currentUser = user;
  launchDashboard();
}

function logout() {
  currentUser = null;
  selectedPatientId = null;
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('patient-dashboard').classList.add('hidden');
  document.getElementById('doctor-dashboard').classList.add('hidden');
  document.getElementById('nav-actions').classList.add('hidden');
}

function launchDashboard() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('nav-actions').classList.remove('hidden');
  document.getElementById('user-badge').textContent = `${currentUser.name} (${currentUser.role.toUpperCase()})`;

  if (currentUser.role === 'patient') {
    document.getElementById('patient-dashboard').classList.remove('hidden');
    renderPatientDashboard();
    initSymptomChips();
    setTimeout(findNearbyHospitals, 200);
  } else {
    document.getElementById('doctor-dashboard').classList.remove('hidden');
    renderDoctorPatientList();
  }
}

// --- 3. PATIENT PERSONAL INFO, EDITING & MEDICAL HISTORY ---
function renderPatientDashboard() {
  const db = getDB();
  currentUser = db.users.find(u => u.id === currentUser.id);
  const hasHistory = currentUser.records && currentUser.records.length > 0;
  const bmi = calculateBMI(currentUser.height, currentUser.weight);

  const pill = document.getElementById('history-status-pill');
  pill.textContent = hasHistory
    ? `Medical History Found (${currentUser.records.length})`
    : 'No Prior Medical History';
  pill.className = `pill ${hasHistory ? 'pill-yes' : 'pill-no'}`;

  document.getElementById('patient-profile-summary').innerHTML = `
    <div class="details-grid">
      <div><strong>Full Name:</strong> ${currentUser.name}</div>
      <div><strong>Age / Gender:</strong> ${currentUser.age} yrs • ${currentUser.gender || 'N/A'}</div>
      <div><strong>Height:</strong> ${currentUser.height} cm</div>
      <div><strong>Weight:</strong> ${currentUser.weight} kg</div>
      <div><strong>Calculated BMI:</strong> ${bmi}</div>
      <div><strong>Blood Group:</strong> ${currentUser.bloodGroup}</div>
      <div><strong>Phone:</strong> ${currentUser.phone || 'Not provided'}</div>
      <div><strong>Emergency:</strong> ${currentUser.emergencyContact || 'Not provided'}</div>
    </div>
    <div style="margin-top:0.5rem;">
      <strong>Address:</strong> ${currentUser.address || 'Not provided'}<br>
      <strong>Allergies:</strong> ${currentUser.allergies || 'None reported'}<br>
      <strong>Baseline Conditions:</strong> ${currentUser.conditions}
    </div>
  `;

  const list = document.getElementById('patient-records-list');
  if (!hasHistory) {
    list.innerHTML = `<p class="subtext">No medical records saved yet. Log your first entry above.</p>`;
    return;
  }

  list.innerHTML = currentUser.records.slice().reverse().map(rec => `
    <div class="record-item ${rec.type === 'prescription' ? 'rx' : ''}">
      <div class="record-meta">${rec.date} • ${rec.type === 'prescription' ? '💊 Doctor Prescription' : '📝 Health Log'} • By ${rec.doctor}</div>
      <strong>${rec.title}</strong>
      <p>${rec.notes}</p>
    </div>
  `).join('');
}

function toggleEditProfile() {
  const form = document.getElementById('edit-profile-form');
  const summary = document.getElementById('patient-profile-summary');
  const isEditing = !form.classList.contains('hidden');

  if (isEditing) {
    form.classList.add('hidden');
    summary.classList.remove('hidden');
  } else {
    document.getElementById('edit-name').value = currentUser.name;
    document.getElementById('edit-age').value = currentUser.age;
    document.getElementById('edit-gender').value = currentUser.gender || 'Male';
    document.getElementById('edit-height').value = currentUser.height !== 'Not set' ? currentUser.height : '';
    document.getElementById('edit-weight').value = currentUser.weight !== 'Not set' ? currentUser.weight : '';
    document.getElementById('edit-blood').value = currentUser.bloodGroup;
    document.getElementById('edit-phone').value = currentUser.phone !== 'Not provided' ? currentUser.phone : '';
    document.getElementById('edit-emergency').value = currentUser.emergencyContact !== 'Not provided' ? currentUser.emergencyContact : '';
    document.getElementById('edit-address').value = currentUser.address !== 'Not provided' ? currentUser.address : '';
    document.getElementById('edit-allergies').value = currentUser.allergies !== 'None reported' ? currentUser.allergies : '';
    document.getElementById('edit-conditions').value = currentUser.conditions !== 'None reported' ? currentUser.conditions : '';

    summary.classList.add('hidden');
    form.classList.remove('hidden');
  }
}

function saveUpdatedProfile(e) {
  e.preventDefault();
  const db = getDB();
  const patient = db.users.find(u => u.id === currentUser.id);

  patient.name = document.getElementById('edit-name').value.trim();
  patient.age = document.getElementById('edit-age').value;
  patient.gender = document.getElementById('edit-gender').value;
  patient.height = document.getElementById('edit-height').value;
  patient.weight = document.getElementById('edit-weight').value;
  patient.bloodGroup = document.getElementById('edit-blood').value;
  patient.phone = document.getElementById('edit-phone').value.trim() || 'Not provided';
  patient.emergencyContact = document.getElementById('edit-emergency').value.trim() || 'Not provided';
  patient.address = document.getElementById('edit-address').value.trim() || 'Not provided';
  patient.allergies = document.getElementById('edit-allergies').value.trim() || 'None reported';
  patient.conditions = document.getElementById('edit-conditions').value.trim() || 'None reported';

  saveDB(db);
  currentUser = patient;
  document.getElementById('user-badge').textContent = `${currentUser.name} (PATIENT)`;
  toggleEditProfile();
  renderPatientDashboard();
  alert('Personal details and vitals saved! Your doctor can now view the updated info.');
}

function addMedicalRecord(e) {
  e.preventDefault();
  const db = getDB();
  const patient = db.users.find(u => u.id === currentUser.id);
  patient.records.push({
    id: `rec_${Date.now()}`,
    type: 'history',
    date: new Date().toISOString().split('T')[0],
    title: document.getElementById('record-title').value.trim(),
    notes: document.getElementById('record-notes').value.trim(),
    doctor: 'Patient Self-Log'
  });
  saveDB(db);
  e.target.reset();
  renderPatientDashboard();
}

// --- 4. AI SYMPTOM PREDICTION ENGINE ---
const commonSymptoms = [
  'Fever', 'Cough', 'Sore Throat', 'Fatigue', 'Headache',
  'Shortness of Breath', 'Chest Pain', 'Nausea', 'Body Ache', 'Runny Nose'
];

const knowledgeBase = [
  { condition: 'Viral Upper Respiratory Infection (Common Cold/Flu)', symptoms: ['fever', 'cough', 'sore throat', 'runny nose', 'body ache', 'fatigue'], urgency: 'Low-Moderate', advice: 'Rest, fluids, monitor temperature. Consult a doctor if fever lasts >3 days.' },
  { condition: 'Migraine / Tension Headache', symptoms: ['headache', 'nausea', 'fatigue', 'dizziness'], urgency: 'Low', advice: 'Rest in a dark room, hydrate, avoid screen strain.' },
  { condition: 'Acute Bronchitis / Asthma Flare-up', symptoms: ['cough', 'shortness of breath', 'fatigue', 'wheezing'], urgency: 'Moderate-High', advice: 'Use prescribed inhaler if asthmatic and schedule a physician review.' },
  { condition: 'Potential Cardiac / Pulmonary Emergency', symptoms: ['chest pain', 'shortness of breath', 'dizziness'], urgency: 'CRITICAL', advice: 'Seek immediate emergency medical care or visit the nearest hospital below.' },
  { condition: 'Gastroenteritis', symptoms: ['nausea', 'fever', 'fatigue', 'stomach pain'], urgency: 'Moderate', advice: 'Oral rehydration salts (ORS) and bland diet.' }
];

let selectedSymptoms = new Set();

function initSymptomChips() {
  const container = document.getElementById('symptom-chips');
  container.innerHTML = commonSymptoms.map(sym => `
    <span class="chip" onclick="toggleSymptom(this, '${sym.toLowerCase()}')">${sym}</span>
  `).join('');
}

function toggleSymptom(el, sym) {
  if (selectedSymptoms.has(sym)) {
    selectedSymptoms.delete(sym);
    el.classList.remove('selected');
  } else {
    selectedSymptoms.add(sym);
    el.classList.add('selected');
  }
}

function runAISymptomCheck() {
  const custom = document.getElementById('custom-symptoms').value
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const allSymptoms = Array.from(new Set([...selectedSymptoms, ...custom]));

  if (allSymptoms.length === 0) {
    alert('Please select or enter at least one symptom.');
    return;
  }

  const scored = knowledgeBase.map(entry => {
    const matches = entry.symptoms.filter(s => allSymptoms.some(u => u.includes(s) || s.includes(u)));
    const confidence = Math.min(95, Math.round((matches.length / entry.symptoms.length) * 100) + (matches.length * 10));
    return { ...entry, matches, confidence };
  }).filter(item => item.matches.length > 0).sort((a, b) => b.confidence - a.confidence);

  const box = document.getElementById('ai-result-box');
  box.classList.remove('hidden', 'urgent');

  if (scored.length === 0) {
    box.innerHTML = `<strong>AI Assessment:</strong> Non-specific symptoms (${allSymptoms.join(', ')}). Recommend booking a general physician consultation.`;
    return;
  }

  const top = scored[0];
  if (top.urgency === 'CRITICAL') box.classList.add('urgent');

  box.innerHTML = `
    <strong>Top AI Prediction:</strong> ${top.condition} (${top.confidence}% match)<br>
    <strong>Urgency Level:</strong> ${top.urgency}<br>
    <strong>Matched Symptoms:</strong> ${top.matches.join(', ')}<br>
    <strong>Guidance:</strong> ${top.advice}<br>
    <button onclick="saveAIResultToHistory('${top.condition}', '${allSymptoms.join(', ')}')" class="btn btn-sm btn-primary mt-1">Save Assessment to My Medical Track</button>
  `;
}

function saveAIResultToHistory(condition, symptoms) {
  const db = getDB();
  const patient = db.users.find(u => u.id === currentUser.id);
  patient.records.push({
    id: `rec_${Date.now()}`,
    type: 'history',
    date: new Date().toISOString().split('T')[0],
    title: `AI Symptom Check: ${condition}`,
    notes: `Reported symptoms: ${symptoms}`,
    doctor: 'MediTrack AI Triage'
  });
  saveDB(db);
  renderPatientDashboard();
  alert('AI symptom assessment saved to your medical track for doctor review.');
}

// --- 5. NEARBY HOSPITAL FINDER (GPS + MANUAL SEARCH) ---
let userMarker = null;
let hospitalMarkers = [];

function findNearbyHospitals() {
  const statusEl = document.getElementById('location-status');
  statusEl.textContent = 'Requesting browser GPS location...';

  if (!navigator.geolocation) {
    statusEl.textContent = 'Geolocation not supported. Enter your city/area above.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      statusEl.textContent = 'Showing hospitals near your current GPS location.';
      loadMapAndHospitals(pos.coords.latitude, pos.coords.longitude, 'Your GPS Location');
    },
    err => {
      if (err.code === err.PERMISSION_DENIED) {
        statusEl.innerHTML = '⚠️ <strong>Location access blocked.</strong> Allow Location in your browser address bar icon, or type your city/area above.';
      } else {
        statusEl.textContent = 'Unable to detect GPS. Enter your city/area above to search.';
      }
      loadMapAndHospitals(18.5204, 73.8567, 'Default Area (Pune)');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function searchLocationByName() {
  const query = document.getElementById('manual-location').value.trim();
  const statusEl = document.getElementById('location-status');
  if (!query) {
    alert('Please enter a city, neighborhood, or pincode.');
    return;
  }

  statusEl.textContent = `Searching for "${query}"...`;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const places = await res.json();
    if (!places || places.length === 0) {
      statusEl.textContent = `Could not find "${query}". Try a nearby city name.`;
      return;
    }
    const lat = parseFloat(places[0].lat);
    const lon = parseFloat(places[0].lon);
    statusEl.textContent = `Showing hospitals near ${places[0].display_name.split(',')[0]}.`;
    loadMapAndHospitals(lat, lon, places[0].display_name.split(',')[0]);
  } catch (e) {
    statusEl.textContent = 'Error looking up location. Check your internet connection.';
  }
}

async function loadMapAndHospitals(lat, lon, label = 'Selected Location') {
  if (!mapInstance) {
    mapInstance = L.map('map').setView([lat, lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);
  } else {
    mapInstance.setView([lat, lon], 13);
  }

  if (userMarker) mapInstance.removeLayer(userMarker);
  hospitalMarkers.forEach(m => mapInstance.removeLayer(m));
  hospitalMarkers = [];

  userMarker = L.marker([lat, lon]).addTo(mapInstance).bindPopup(`📍 ${label}`).openPopup();

  const listEl = document.getElementById('hospital-list');
  listEl.innerHTML = '<li>Searching nearby hospitals within 5 km...</li>';

  try {
    const query = `[out:json];(node["amenity"="hospital"](around:5000,${lat},${lon});way["amenity"="hospital"](around:5000,${lat},${lon}););out center 10;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.elements || data.elements.length === 0) {
      listEl.innerHTML = '<li>No hospitals found within 5 km. Try searching a larger nearby city.</li>';
      return;
    }

    listEl.innerHTML = data.elements.map(h => {
      const hLat = h.lat || h.center.lat;
      const hLon = h.lon || h.center.lon;
      const name = (h.tags && h.tags.name) ? h.tags.name : 'Medical Center / Hospital';
      const marker = L.marker([hLat, hLon]).addTo(mapInstance).bindPopup(`<strong>🏥 ${name}</strong>`);
      hospitalMarkers.push(marker);
      return `<li>🏥 <strong>${name}</strong></li>`;
    }).join('');
  } catch (err) {
    listEl.innerHTML = '<li>Hospital server busy. Click Search or Use GPS again in a few seconds.</li>';
  }
}

// --- 6. DOCTOR REVIEW (WITH FULL PATIENT PERSONAL DETAILS) & PRESCRIPTION ---
function renderDoctorPatientList() {
  const db = getDB();
  const query = document.getElementById('patient-search').value.toLowerCase();
  const patients = db.users.filter(u =>
    u.role === 'patient' && (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.phone && u.phone.toLowerCase().includes(query))
    )
  );

  const container = document.getElementById('doctor-patient-list');
  container.innerHTML = patients.map(p => {
    const hasHistory = p.records && p.records.length > 0;
    return `
      <div class="record-item patient-card" onclick="selectPatientForReview('${p.id}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${p.name}</strong>
          <span class="pill ${hasHistory ? 'pill-yes' : 'pill-no'}">
            ${hasHistory ? `History: Yes (${p.records.length})` : 'History: None'}
          </span>
        </div>
        <div class="record-meta">${p.age} yrs • ${p.gender || 'N/A'} • Blood: ${p.bloodGroup} • ${p.phone || p.email}</div>
      </div>
    `;
  }).join('');
}

function selectPatientForReview(patientId) {
  selectedPatientId = patientId;
  const db = getDB();
  const patient = db.users.find(u => u.id === patientId);
  const hasHistory = patient.records && patient.records.length > 0;
  const bmi = calculateBMI(patient.height, patient.weight);

  document.getElementById('doctor-review-empty').classList.add('hidden');
  document.getElementById('doctor-review-panel').classList.remove('hidden');

  document.getElementById('selected-patient-header').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
      <strong style="font-size:1.05rem;">👤 ${patient.name}</strong>
      <span class="pill ${hasHistory ? 'pill-yes' : 'pill-no'}">
        ${hasHistory ? '✅ Medical History Verified' : '⚠️ No Prior History'}
      </span>
    </div>
    <div class="details-grid">
      <div><strong>Age / Gender:</strong> ${patient.age} yrs • ${patient.gender || 'N/A'}</div>
      <div><strong>Blood Group:</strong> ${patient.bloodGroup}</div>
      <div><strong>Height:</strong> ${patient.height} cm</div>
      <div><strong>Weight:</strong> ${patient.weight} kg</div>
      <div><strong>BMI:</strong> ${bmi}</div>
      <div><strong>Phone:</strong> ${patient.phone || 'Not provided'}</div>
    </div>
    <div style="margin-top:0.5rem;">
      <strong>Emergency Contact:</strong> ${patient.emergencyContact || 'Not provided'}<br>
      <strong>Address:</strong> ${patient.address || 'Not provided'}<br>
      <strong>⚠️ Allergies:</strong> <span style="color:#dc2626; font-weight:600;">${patient.allergies || 'None reported'}</span><br>
      <strong>Baseline Conditions:</strong> ${patient.conditions}
    </div>
  `;

  const recContainer = document.getElementById('doctor-patient-records');
  recContainer.innerHTML = hasHistory
    ? patient.records.slice().reverse().map(rec => `
        <div class="record-item ${rec.type === 'prescription' ? 'rx' : ''}">
          <div class="record-meta">${rec.date} • ${rec.doctor}</div>
          <strong>${rec.title}</strong>
          <p>${rec.notes}</p>
        </div>
      `).join('')
    : '<p class="subtext">This patient has no prior medical records on file.</p>';
}

function prescribeMedication(e) {
  e.preventDefault();
  if (!selectedPatientId) return;

  const db = getDB();
  const patient = db.users.find(u => u.id === selectedPatientId);
  const diagnosis = document.getElementById('rx-diagnosis').value.trim();
  const meds = document.getElementById('rx-meds').value.trim();
  const advice = document.getElementById('rx-advice').value.trim();

  patient.records.push({
    id: `rx_${Date.now()}`,
    type: 'prescription',
    date: new Date().toISOString().split('T')[0],
    title: `Rx: ${diagnosis}`,
    notes: `Medication: ${meds}${advice ? ` | Advice: ${advice}` : ''}`,
    doctor: `${currentUser.name} (${currentUser.specialty})`
  });

  saveDB(db);
  e.target.reset();
  selectPatientForReview(selectedPatientId);
  renderDoctorPatientList();
  alert(`Prescription saved to ${patient.name}'s permanent medical track.`);
}