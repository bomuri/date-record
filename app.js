const STORAGE_KEY = "dateDiaryData";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const moods = ["😍", "😊", "😌", "🤩", "😢", "😡"];

const state = {
  entries: [],
  activeTab: "timeline",
  editingId: null,
  map: null,
  markersLayer: null,
  routeLine: null,
};

const els = {
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  timelineList: document.getElementById("timelineList"),
  timelineEmpty: document.getElementById("timelineEmpty"),
  searchInput: document.getElementById("searchInput"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  entryForm: document.getElementById("entryForm"),
  entryDate: document.getElementById("entryDate"),
  entryTitle: document.getElementById("entryTitle"),
  entryTags: document.getElementById("entryTags"),
  entryDiary: document.getElementById("entryDiary"),
  moodGroup: document.getElementById("moodGroup"),
  placeList: document.getElementById("placeList"),
  addPlaceBtn: document.getElementById("addPlaceBtn"),
  resetBtn: document.getElementById("resetBtn"),
  placeTemplate: document.getElementById("placeItemTemplate"),
  mapEntrySelect: document.getElementById("mapEntrySelect"),
  mapHint: document.getElementById("mapHint"),
};

function uid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function parseTags(raw) {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.entries = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.entries = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.entries = [];
    alert("저장된 데이터 파싱에 실패해 초기화합니다.");
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function switchTab(tabId) {
  state.activeTab = tabId;
  els.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  if (tabId === "map") {
    ensureMap();
    renderMapOptions();
    drawMapForSelectedEntry();
  }
}

function renderMoodChips(selectedMood = moods[0]) {
  els.moodGroup.innerHTML = "";
  moods.forEach((mood) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mood-chip ${mood === selectedMood ? "selected" : ""}`;
    btn.dataset.mood = mood;
    btn.textContent = mood;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mood-chip").forEach((chip) => chip.classList.remove("selected"));
      btn.classList.add("selected");
    });
    els.moodGroup.appendChild(btn);
  });
}

function readCurrentPlacesFromDom() {
  return [...els.placeList.querySelectorAll(".place-item")].map((item, index) => {
    const selectedAddress = item.dataset.selectedAddress ? JSON.parse(item.dataset.selectedAddress) : null;
    return {
      id: item.dataset.id || uid(),
      placeName: item.querySelector(".place-name").value.trim(),
      category: item.querySelector(".place-category").value.trim(),
      address: selectedAddress?.address || "",
      lat: selectedAddress?.lat ?? null,
      lng: selectedAddress?.lng ?? null,
      time: item.querySelector(".place-time").value || "",
      notes: item.querySelector(".place-notes").value.trim(),
      rating: Number(item.querySelector(".place-rating").value) || 1,
      orderIndex: index,
    };
  });
}

function createPlaceItem(place = null) {
  const node = els.placeTemplate.content.firstElementChild.cloneNode(true);
  const placeData = {
    id: place?.id || uid(),
    placeName: place?.placeName || "",
    category: place?.category || "",
    address: place?.address || "",
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    time: place?.time || "",
    notes: place?.notes || "",
    rating: place?.rating || 5,
  };

  node.dataset.id = placeData.id;
  node.dataset.selectedAddress = JSON.stringify({
    address: placeData.address,
    lat: placeData.lat,
    lng: placeData.lng,
  });

  node.querySelector(".place-name").value = placeData.placeName;
  node.querySelector(".place-category").value = placeData.category;
  node.querySelector(".place-time").value = placeData.time;
  node.querySelector(".place-notes").value = placeData.notes;
  node.querySelector(".place-rating").value = placeData.rating;
  const selectedAddressEl = node.querySelector(".selected-address");
  selectedAddressEl.textContent = `선택된 주소: ${placeData.address || "없음"}`;

  node.querySelector(".delete").addEventListener("click", () => {
    node.remove();
    refreshPlaceTitles();
  });

  node.querySelector(".move-up").addEventListener("click", () => {
    const prev = node.previousElementSibling;
    if (prev) {
      els.placeList.insertBefore(node, prev);
      refreshPlaceTitles();
    }
  });

  node.querySelector(".move-down").addEventListener("click", () => {
    const next = node.nextElementSibling;
    if (next) {
      els.placeList.insertBefore(next, node);
      refreshPlaceTitles();
    }
  });

  let debounceTimer = null;
  const queryInput = node.querySelector(".place-address-query");
  const resultsEl = node.querySelector(".search-results");

  queryInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = queryInput.value.trim();
    if (q.length < 2) {
      resultsEl.innerHTML = "";
      return;
    }

    debounceTimer = setTimeout(async () => {
      resultsEl.innerHTML = "검색 중...";
      try {
        const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("검색 요청 실패");
        }

        const results = await response.json();
        resultsEl.innerHTML = "";

        if (!Array.isArray(results) || !results.length) {
          resultsEl.textContent = "검색 결과가 없습니다.";
          return;
        }

        results.forEach((res) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "result-item";
          btn.textContent = res.display_name;
          btn.addEventListener("click", () => {
            const selected = {
              address: res.display_name,
              lat: Number(res.lat),
              lng: Number(res.lon),
            };
            node.dataset.selectedAddress = JSON.stringify(selected);
            selectedAddressEl.textContent = `선택된 주소: ${selected.address}`;
            queryInput.value = selected.address;
            resultsEl.innerHTML = "";
          });
          resultsEl.appendChild(btn);
        });
      } catch {
        resultsEl.textContent = "주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      }
    }, 500);
  });

  els.placeList.appendChild(node);
  refreshPlaceTitles();
}

function refreshPlaceTitles() {
  [...els.placeList.querySelectorAll(".place-item")].forEach((item, idx) => {
    item.querySelector(".place-title").textContent = `장소 ${idx + 1}`;
  });
}

function renderTimeline() {
  const q = els.searchInput.value.trim().toLowerCase();
  const entries = [...state.entries]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((entry) => {
      if (!q) return true;
      const haystack = [
        entry.title,
        entry.diary,
        ...(entry.tags || []),
        ...(entry.places || []).map((p) => p.placeName),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

  els.timelineList.innerHTML = "";
  els.timelineEmpty.classList.toggle("hidden", entries.length > 0);

  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "timeline-card";
    card.innerHTML = `
      <h3>${entry.date} · ${entry.title}</h3>
      <p class="timeline-meta">기분 ${entry.mood || "-"} · 장소 ${entry.places?.length || 0}곳</p>
      <div class="tag-list">${(entry.tags || []).map((tag) => `<span class="tag">#${tag}</span>`).join("")}</div>
      <p>${entry.diary || ""}</p>
      <div class="form-actions">
        <button type="button" data-action="edit">수정</button>
        <button type="button" data-action="delete">삭제</button>
      </div>
    `;

    card.querySelector("[data-action='edit']").addEventListener("click", () => {
      loadEntryToForm(entry.id);
      switchTab("editor");
    });

    card.querySelector("[data-action='delete']").addEventListener("click", () => {
      const ok = confirm("이 기록을 삭제할까요?");
      if (!ok) return;
      state.entries = state.entries.filter((it) => it.id !== entry.id);
      saveData();
      renderTimeline();
      renderMapOptions();
    });

    els.timelineList.appendChild(card);
  });
}

function getSelectedMood() {
  return document.querySelector(".mood-chip.selected")?.dataset.mood || moods[0];
}

function resetForm() {
  state.editingId = null;
  els.entryForm.reset();
  els.entryDate.value = new Date().toISOString().slice(0, 10);
  renderMoodChips(moods[0]);
  els.placeList.innerHTML = "";
  createPlaceItem();
}

function loadEntryToForm(id) {
  const entry = state.entries.find((it) => it.id === id);
  if (!entry) return;
  state.editingId = id;
  els.entryDate.value = entry.date;
  els.entryTitle.value = entry.title;
  els.entryTags.value = (entry.tags || []).join(", ");
  els.entryDiary.value = entry.diary || "";
  renderMoodChips(entry.mood || moods[0]);

  els.placeList.innerHTML = "";
  const sortedPlaces = [...(entry.places || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  if (!sortedPlaces.length) {
    createPlaceItem();
  } else {
    sortedPlaces.forEach((place) => createPlaceItem(place));
  }
}

function handleSaveEntry(event) {
  event.preventDefault();
  const places = readCurrentPlacesFromDom().map((place, idx) => ({ ...place, orderIndex: idx }));

  if (!places.some((p) => p.placeName)) {
    alert("최소 1개 장소명은 입력해 주세요.");
    return;
  }

  const base = {
    date: els.entryDate.value,
    title: els.entryTitle.value.trim(),
    diary: els.entryDiary.value.trim(),
    mood: getSelectedMood(),
    tags: parseTags(els.entryTags.value),
    places,
    updatedAt: nowIso(),
  };

  if (state.editingId) {
    state.entries = state.entries.map((entry) =>
      entry.id === state.editingId ? { ...entry, ...base } : entry
    );
  } else {
    state.entries.push({
      id: uid(),
      ...base,
      createdAt: nowIso(),
    });
  }

  saveData();
  renderTimeline();
  renderMapOptions();
  alert("저장되었습니다.");
  resetForm();
  switchTab("timeline");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `date-diary-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error("Invalid format");
      const ok = confirm("현재 데이터를 가져온 데이터로 교체합니다. 계속할까요?");
      if (!ok) return;
      state.entries = parsed;
      saveData();
      renderTimeline();
      renderMapOptions();
      alert("가져오기가 완료되었습니다.");
    } catch {
      alert("올바른 JSON 파일이 아닙니다.");
    }
  };
  reader.readAsText(file, "utf-8");
}

function ensureMap() {
  if (state.map) return;
  state.map = L.map("mapView").setView([37.5665, 126.978], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(state.map);
  state.markersLayer = L.layerGroup().addTo(state.map);
}

function renderMapOptions() {
  const sorted = [...state.entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  els.mapEntrySelect.innerHTML = "";

  if (!sorted.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "기록이 없습니다";
    els.mapEntrySelect.appendChild(opt);
    return;
  }

  sorted.forEach((entry) => {
    const opt = document.createElement("option");
    opt.value = entry.id;
    opt.textContent = `${entry.date} · ${entry.title}`;
    els.mapEntrySelect.appendChild(opt);
  });
}

function drawMapForSelectedEntry() {
  if (!state.map) return;
  const id = els.mapEntrySelect.value;
  const entry = state.entries.find((it) => it.id === id);

  state.markersLayer.clearLayers();
  if (state.routeLine) {
    state.map.removeLayer(state.routeLine);
    state.routeLine = null;
  }

  if (!entry) {
    els.mapHint.textContent = "표시할 기록을 선택해 주세요.";
    return;
  }

  const points = (entry.places || [])
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number");

  if (!points.length) {
    els.mapHint.textContent = "좌표가 저장된 장소가 없습니다. 작성 화면에서 주소를 선택해 주세요.";
    return;
  }

  els.mapHint.textContent = `${entry.date} 코스 ${points.length}곳 표시 중`;

  const latlngs = points.map((p) => [p.lat, p.lng]);
  points.forEach((place, idx) => {
    L.marker([place.lat, place.lng])
      .bindPopup(
        `<strong>${idx + 1}. ${place.placeName || "장소"}</strong><br/>시간: ${place.time || "-"}<br/>평점: ${place.rating || "-"}<br/>메모: ${place.notes || "-"}`
      )
      .addTo(state.markersLayer);
  });

  state.routeLine = L.polyline(latlngs, { color: "#2563eb", weight: 4 }).addTo(state.map);
  state.map.fitBounds(state.routeLine.getBounds(), { padding: [20, 20] });
}

function bindEvents() {
  els.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  els.searchInput.addEventListener("input", renderTimeline);
  els.addPlaceBtn.addEventListener("click", () => createPlaceItem());
  els.entryForm.addEventListener("submit", handleSaveEntry);
  els.resetBtn.addEventListener("click", resetForm);
  els.exportBtn.addEventListener("click", exportJson);
  els.importFile.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
    e.target.value = "";
  });
  els.mapEntrySelect.addEventListener("change", drawMapForSelectedEntry);
}

function init() {
  loadData();
  bindEvents();
  renderMoodChips();
  resetForm();
  renderTimeline();
  renderMapOptions();
}

init();
