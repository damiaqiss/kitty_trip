// ---- CONSTANTS ----
const MEMBERS = ["Che Hasmawie", "Firhan Anaqi", "Amalin Safiyya", "Damia Natasha", "Damia Qistina"];
const UNIS = ["IPG", "UUM", "UKM", "USM"];

// ---- FIREBASE INIT ----
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let activeUni = "IPG";

// ---- INIT UI ----
function populateMemberDropdowns() {
  const selects = [
    document.getElementById("academicMember"),
    document.getElementById("voterSelect"),
    document.getElementById("wishMember"),
    document.getElementById("itineraryMember"),
    document.getElementById("photoMember"),
    document.getElementById("themeMember"),
  ];
  selects.forEach((sel) => {
    sel.innerHTML = MEMBERS.map((m) => `<option value="${m}">${m}</option>`).join("");
  });
}

function renderMemberChips() {
  const row = document.getElementById("memberRow");
  row.innerHTML = MEMBERS.map((m) => `<span class="member-chip">${m}</span>`).join("");
}

populateMemberDropdowns();
renderMemberChips();

// ---- PAGE NAVIGATION ----
document.getElementById("pageNav").addEventListener("click", (e) => {
  const btn = e.target.closest(".page-nav-btn");
  if (!btn) return;
  const page = btn.dataset.page;

  document.querySelectorAll(".page-nav-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---- UNIVERSITY TABS ----
document.getElementById("uniTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".uni-tab");
  if (!btn) return;
  document.querySelectorAll(".uni-tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  activeUni = btn.dataset.uni;
  loadAcademicEntries();
});

// ---- ACADEMIC CALENDAR ----
document.getElementById("academicForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector("button[type=submit]");
  const member = document.getElementById("academicMember").value;
  const start = document.getElementById("academicStart").value;
  const end = document.getElementById("academicEnd").value;
  const note = document.getElementById("academicNote").value.trim();
  const fileInput = document.getElementById("academicFile");
  const file = fileInput.files[0];

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const entry = {
      uni: activeUni,
      member,
      start,
      end,
      note,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (file) {
      if (file.type === "application/pdf") {
        if (file.size > 650 * 1024) {
          throw new Error("This PDF is too large (max ~650KB after compression). Please compress the PDF first (try ilovepdf.com/compress_pdf), or upload a screenshot image instead.");
        }
        const dataUrl = await fileToDataUrl(file);
        if (dataUrl.length > 1000000) {
          throw new Error("This PDF is still too large to save. Please compress it further or upload a screenshot image instead.");
        }
        entry.fileData = dataUrl;
        entry.fileType = "pdf";
        entry.fileName = file.name;
      } else if (file.type.startsWith("image/")) {
        entry.fileData = await compressImageToDataUrl(file);
        entry.fileType = "image";
      } else {
        throw new Error("Please upload an image or a PDF file.");
      }
    }

    await db.collection("academicCalendar").add(entry);
    e.target.reset();
    loadAcademicEntries();
  } catch (err) {
    alert("Failed to save: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add date";
  }
});

// Read any file straight to a base64 data URL, no resizing (used for PDFs).
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// Resize + compress an image file down to a small JPEG data URL
// so it stays well under Firestore's 1MB per-document limit.
function compressImageToDataUrl(file, maxDimension = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That is not a valid image file"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function loadAcademicEntries() {
  const list = document.getElementById("academicList");
  list.innerHTML = `<li class="empty-note">Loading...</li>`;

  const snap = await db
    .collection("academicCalendar")
    .where("uni", "==", activeUni)
    .orderBy("start", "asc")
    .get();

  if (snap.empty) {
    list.innerHTML = `<li class="empty-note">No dates for ${activeUni} yet.</li>`;
    return;
  }

  list.innerHTML = snap.docs
    .map((doc) => {
      const d = doc.data();
      let thumb = "";
      if (d.fileData && d.fileType === "pdf") {
        thumb = `<a href="${d.fileData}" download="${d.fileName || "calendar.pdf"}" class="entry-file-link">📄 ${d.fileName || "View PDF"}</a>`;
      } else if (d.fileData) {
        thumb = `<img src="${d.fileData}" class="entry-thumb" data-full="${d.fileData}" alt="Calendar ${d.member}">`;
      }
      return `<li class="entry-item" data-id="${doc.id}"><div><b>${d.member}</b> — ${formatDate(d.start)} to ${formatDate(d.end)}${d.note ? ` <span style="color:rgba(42,16,19,0.55)">(${d.note})</span>` : ""}${thumb}</div><button class="delete-btn" data-id="${doc.id}" title="Delete">✕</button></li>`;
    })
    .join("");

  list.querySelectorAll(".entry-thumb").forEach((img) => {
    img.addEventListener("click", () => {
      document.getElementById("modalBody").innerHTML = `<img src="${img.dataset.full}" style="width:100%;border-radius:8px;">`;
      document.getElementById("modalBackdrop").classList.add("open");
    });
  });

  list.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this date entry?")) return;
      await db.collection("academicCalendar").doc(btn.dataset.id).delete();
      loadAcademicEntries();
    });
  });
}

// ---- DATE VOTING ----
document.getElementById("voteBtn").addEventListener("click", async () => {
  const voter = document.getElementById("voterSelect").value;
  const date = document.getElementById("voteDate").value;
  if (!date) return alert("Please pick a date first.");

  const ref = db.collection("dateVotes").doc(date);
  const doc = await ref.get();
  const existing = doc.exists ? doc.data().voters || [] : [];

  if (!existing.includes(voter)) {
    await ref.set({ voters: [...existing, voter] }, { merge: true });
  }
  loadVotes();
});

async function loadVotes() {
  const board = document.getElementById("voteBoard");
  board.innerHTML = `<p class="empty-note">Loading...</p>`;

  const snap = await db.collection("dateVotes").get();
  if (snap.empty) {
    board.innerHTML = `<p class="empty-note">No one has voted yet.</p>`;
    return;
  }

  const rows = snap.docs.map((doc) => ({ date: doc.id, voters: doc.data().voters || [] }));
  rows.sort((a, b) => b.voters.length - a.voters.length || a.date.localeCompare(b.date));
  const maxVotes = Math.max(...rows.map((r) => r.voters.length));

  board.innerHTML = rows
    .map((r) => {
      const isWinner = r.voters.length === maxVotes && maxVotes > 0;
      const nameChips = r.voters
        .map((v) => `<span class="voter-name" data-date="${r.date}" data-voter="${v}" title="Click to remove your vote">${v}</span>`)
        .join(", ");
      return `
        <div class="vote-row ${isWinner ? "winner" : "losing"}">
          <div>
            <div class="vote-date">${formatDate(r.date)} ${isWinner ? '<span class="winner-tag">WINNING</span>' : '<span class="losing-tag">LOSING</span>'}</div>
            <div class="vote-names">${nameChips}</div>
          </div>
          <span class="vote-count">${r.voters.length} vote${r.voters.length === 1 ? "" : "s"}</span>
        </div>`;
    })
    .join("");

  board.querySelectorAll(".voter-name").forEach((el) => {
    el.addEventListener("click", async () => {
      if (!confirm(`Remove ${el.dataset.voter}'s vote for ${formatDate(el.dataset.date)}?`)) return;
      const ref = db.collection("dateVotes").doc(el.dataset.date);
      const doc = await ref.get();
      const voters = (doc.data().voters || []).filter((v) => v !== el.dataset.voter);
      await ref.set({ voters }, { merge: true });
      loadVotes();
    });
  });
}

// ---- WISHLIST ----
document.getElementById("wishlistForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const member = document.getElementById("wishMember").value;
  const place = document.getElementById("wishPlace").value.trim();
  const food = document.getElementById("wishFood").value.trim();
  const note = document.getElementById("wishNote").value.trim();

  await db.collection("wishlist").add({
    member,
    place,
    food,
    note,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  e.target.reset();
  loadWishlist();
});

async function loadWishlist() {
  const grid = document.getElementById("wishlistGrid");
  grid.innerHTML = `<p class="empty-note">Loading...</p>`;

  const snap = await db.collection("wishlist").orderBy("createdAt", "desc").get();
  if (snap.empty) {
    grid.innerHTML = `<p class="empty-note">Wishlist is empty. Add the first place!</p>`;
    return;
  }

  grid.innerHTML = snap.docs
    .map((doc) => {
      const d = doc.data();
      return `
        <div class="wish-card" data-id="${doc.id}">
          <div>
            <h3>${d.place}</h3>
            <p>suggested by ${d.member}</p>
          </div>
          <button class="delete-btn" data-id="${doc.id}" title="Delete">✕</button>
        </div>`;
    })
    .join("");

  grid.querySelectorAll(".wish-card").forEach((card) => {
    card.addEventListener("click", async (e) => {
      if (e.target.closest(".delete-btn")) return;
      const docSnap = await db.collection("wishlist").doc(card.dataset.id).get();
      openWishModal(docSnap.data());
    });
  });

  grid.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Remove this from the wishlist?")) return;
      await db.collection("wishlist").doc(btn.dataset.id).delete();
      loadWishlist();
    });
  });
}

function openWishModal(d) {
  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <h3>${d.place}</h3>
    <dl>
      <dt>Suggested by</dt><dd>${d.member}</dd>
      <dt>Food to try</dt><dd>${d.food || "-"}</dd>
      <dt>Note</dt><dd>${d.note || "-"}</dd>
    </dl>`;
  document.getElementById("modalBackdrop").classList.add("open");
}

document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("modalBackdrop").classList.remove("open");
});
document.getElementById("modalBackdrop").addEventListener("click", (e) => {
  if (e.target.id === "modalBackdrop") e.target.classList.remove("open");
});

// ---- HELPERS ----
function formatDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---- PAYMENT TRACKER ----
document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("paymentTitle").value.trim();
  const amount = parseFloat(document.getElementById("paymentAmount").value);

  await db.collection("payments").add({
    title,
    amount,
    paidBy: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  e.target.reset();
  loadPayments();
});

async function loadPayments() {
  const list = document.getElementById("paymentList");
  list.innerHTML = `<p class="empty-note">Loading...</p>`;

  const snap = await db.collection("payments").orderBy("createdAt", "asc").get();
  if (snap.empty) {
    list.innerHTML = `<p class="empty-note">No payment items yet. Add the first one, e.g. hotel deposit.</p>`;
    return;
  }

  list.innerHTML = snap.docs
    .map((doc) => {
      const d = doc.data();
      const paidBy = d.paidBy || [];
      const chips = MEMBERS.map((m) => {
        const paid = paidBy.includes(m);
        return `<span class="payer-chip ${paid ? "paid" : ""}" data-id="${doc.id}" data-member="${m}">${m}</span>`;
      }).join("");
      return `
        <div class="payment-card">
          <div class="payment-top">
            <span class="payment-title">${d.title}</span>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="payment-amount">RM ${Number(d.amount).toFixed(2)} / person</span>
              <button class="delete-btn" data-id="${doc.id}" title="Delete">✕</button>
            </div>
          </div>
          <div class="payment-progress">${paidBy.length} / ${MEMBERS.length} paid</div>
          <div class="payer-chips">${chips}</div>
        </div>`;
    })
    .join("");

  list.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this payment item?")) return;
      await db.collection("payments").doc(btn.dataset.id).delete();
      loadPayments();
    });
  });

  list.querySelectorAll(".payer-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const id = chip.dataset.id;
      const member = chip.dataset.member;
      const ref = db.collection("payments").doc(id);
      const doc = await ref.get();
      const paidBy = doc.data().paidBy || [];
      const updated = paidBy.includes(member)
        ? paidBy.filter((m) => m !== member)
        : [...paidBy, member];
      await ref.update({ paidBy: updated });
      loadPayments();
    });
  });
}

// ---- TENTATIVE ITINERARY ----
let activeDay = 1;
let itineraryDays = [1];

function renderDayTabs() {
  const tabs = document.getElementById("dayTabs");
  tabs.innerHTML = itineraryDays
    .map((d) => `<button class="uni-tab ${d === activeDay ? "active" : ""}" data-day="${d}">Day ${d}</button>`)
    .join("");
  tabs.querySelectorAll(".uni-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeDay = Number(btn.dataset.day);
      renderDayTabs();
      loadItinerary();
      loadThemes();
    });
  });
}

document.getElementById("addDayBtn").addEventListener("click", () => {
  const nextDay = Math.max(...itineraryDays) + 1;
  itineraryDays.push(nextDay);
  activeDay = nextDay;
  renderDayTabs();
  loadItinerary();
  loadThemes();
});

document.getElementById("addThemeBtn").addEventListener("click", async () => {
  const theme = document.getElementById("themeInput").value.trim();
  const member = document.getElementById("themeMember").value;
  if (!theme) return;

  await db.collection("dayThemes").add({
    day: activeDay,
    theme,
    member,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  document.getElementById("themeInput").value = "";
  loadThemes();
});

async function loadThemes() {
  const list = document.getElementById("themeChipList");
  list.innerHTML = `<p class="empty-note">Loading...</p>`;

  const snap = await db
    .collection("dayThemes")
    .where("day", "==", activeDay)
    .orderBy("createdAt", "asc")
    .get();

  if (snap.empty) {
    list.innerHTML = `<p class="empty-note">No theme ideas for Day ${activeDay} yet.</p>`;
    return;
  }

  list.innerHTML = snap.docs
    .map((doc) => {
      const d = doc.data();
      return `<span class="theme-chip"><b>${d.theme}</b> — ${d.member} <button class="delete-btn" data-id="${doc.id}" title="Delete">✕</button></span>`;
    })
    .join("");

  list.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this theme idea?")) return;
      await db.collection("dayThemes").doc(btn.dataset.id).delete();
      loadThemes();
    });
  });
}

document.getElementById("itineraryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const slot = document.getElementById("itinerarySlot").value;
  const member = document.getElementById("itineraryMember").value;
  const activity = document.getElementById("itineraryActivity").value.trim();

  await db.collection("itinerary").add({
    day: activeDay,
    slot,
    activity,
    addedBy: member,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  e.target.reset();
  loadItinerary();
});

async function loadItinerary() {
  const board = document.getElementById("itineraryBoard");
  board.innerHTML = `<p class="empty-note">Loading...</p>`;

  const snap = await db
    .collection("itinerary")
    .where("day", "==", activeDay)
    .orderBy("createdAt", "asc")
    .get();

  if (snap.empty) {
    board.innerHTML = `<p class="empty-note">No activities planned for Day ${activeDay} yet.</p>`;
    return;
  }

  const slotOrder = ["Morning", "Afternoon", "Evening", "Night"];
  const bySlot = {};
  snap.docs.forEach((doc) => {
    const d = doc.data();
    if (!bySlot[d.slot]) bySlot[d.slot] = [];
    bySlot[d.slot].push({ id: doc.id, ...d });
  });

  board.innerHTML = slotOrder
    .filter((slot) => bySlot[slot])
    .map((slot) => {
      const items = bySlot[slot]
        .map((d) => `<div class="itinerary-item"><div>${d.activity} <span>— added by ${d.addedBy}</span></div><button class="delete-btn" data-id="${d.id}" title="Delete">✕</button></div>`)
        .join("");
      return `<div class="slot-group"><div class="slot-label">${slot}</div>${items}</div>`;
    })
    .join("");

  board.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this activity?")) return;
      await db.collection("itinerary").doc(btn.dataset.id).delete();
      loadItinerary();
    });
  });
}

// ---- TRIP CORE PHOTO GALLERY ----
document.getElementById("photoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector("button[type=submit]");
  const member = document.getElementById("photoMember").value;
  const caption = document.getElementById("photoCaption").value.trim();
  const file = document.getElementById("photoFile").files[0];
  if (!file) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  try {
    const imageData = await compressImageToDataUrl(file, 700, 0.65);
    await db.collection("photos").add({
      imageData,
      member,
      caption,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    e.target.reset();
    loadPhotos();
  } catch (err) {
    alert("Failed to upload: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload photo";
  }
});

async function loadPhotos() {
  const grid = document.getElementById("photoGrid");
  grid.innerHTML = `<p class="empty-note">Loading...</p>`;

  const snap = await db.collection("photos").orderBy("createdAt", "desc").get();
  if (snap.empty) {
    grid.innerHTML = `<p class="empty-note">No photos yet. Upload the first one!</p>`;
    return;
  }

  grid.innerHTML = snap.docs
    .map((doc) => {
      const d = doc.data();
      return `
        <div class="photo-card">
          <img src="${d.imageData}" data-full="${d.imageData}" alt="${d.caption || "Trip photo"}">
          <button class="delete-btn" data-id="${doc.id}" title="Delete">✕</button>
          <div class="photo-caption"><b>${d.member}</b>${d.caption ? ` — ${d.caption}` : ""}</div>
        </div>`;
    })
    .join("");

  grid.querySelectorAll(".photo-card img").forEach((img) => {
    img.addEventListener("click", () => {
      document.getElementById("modalBody").innerHTML = `<img src="${img.dataset.full}" style="width:100%;border-radius:8px;">`;
      document.getElementById("modalBackdrop").classList.add("open");
    });
  });

  grid.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this photo?")) return;
      await db.collection("photos").doc(btn.dataset.id).delete();
      loadPhotos();
    });
  });
}

// ---- LOAD ON START ----
loadAcademicEntries();
loadVotes();
loadWishlist();
loadPayments();
renderDayTabs();
loadItinerary();
loadThemes();
loadPhotos();
