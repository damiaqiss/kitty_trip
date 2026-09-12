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
        if (file.size > 900 * 1024) {
          throw new Error("This PDF is too large (max ~900KB). Try compressing it first, or upload a screenshot image instead.");
        }
        entry.fileData = await fileToDataUrl(file);
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
      return `<li class="entry-item"><b>${d.member}</b> — ${formatDate(d.start)} to ${formatDate(d.end)}${d.note ? ` <span style="color:rgba(42,16,19,0.55)">(${d.note})</span>` : ""}${thumb}</li>`;
    })
    .join("");

  list.querySelectorAll(".entry-thumb").forEach((img) => {
    img.addEventListener("click", () => {
      document.getElementById("modalBody").innerHTML = `<img src="${img.dataset.full}" style="width:100%;border-radius:8px;">`;
      document.getElementById("modalBackdrop").classList.add("open");
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
      return `
        <div class="vote-row ${isWinner ? "winner" : ""}">
          <div>
            <div class="vote-date">${formatDate(r.date)} ${isWinner ? '<span class="winner-tag">WINNING</span>' : ""}</div>
            <div class="vote-names">${r.voters.join(", ")}</div>
          </div>
          <span class="vote-count">${r.voters.length} vote${r.voters.length === 1 ? "" : "s"}</span>
        </div>`;
    })
    .join("");
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
          <h3>${d.place}</h3>
          <p>suggested by ${d.member}</p>
        </div>`;
    })
    .join("");

  grid.querySelectorAll(".wish-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const docSnap = await db.collection("wishlist").doc(card.dataset.id).get();
      openWishModal(docSnap.data());
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

// ---- LOAD ON START ----
loadAcademicEntries();
loadVotes();
loadWishlist();
