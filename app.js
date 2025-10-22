const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2, 10);

const store = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("cc_user") || "null");
    } catch {
      return null;
    }
  },
  setUser(u) {
    localStorage.setItem("cc_user", JSON.stringify(u));
  },
  signOut() {
    localStorage.removeItem("cc_user");
  },
  getListings() {
    try {
      return JSON.parse(localStorage.getItem("cc_listings") || "[]");
    } catch {
      return [];
    }
  },
  setListings(arr) {
    localStorage.setItem("cc_listings", JSON.stringify(arr));
  },
};

let editId = null;
let photoDataUrl = "";

// --- Auth UI ---
function renderAuth() {
  const area = $("#authArea");
  area.innerHTML = "";
  const user = store.getUser();
  if (!user) {
    const input = document.createElement("input");
    input.placeholder = "school email (.edu)";
    input.id = "emailInput";
    input.className = "pill";
    input.style.background = "#0e1736";
    input.style.border = "1px solid #ffffff24";
    input.style.color = "var(--ink)";
    const btn = document.createElement("button");
    btn.textContent = "Sign In";
    btn.className = "btn solid";
    btn.onclick = () => {
      const email = input.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.edu$/i.test(email)) {
        alert("Please use a valid .edu email");
        return;
      }
      store.setUser({ email, name: email.split("@")[0] });
      renderAuth();
      refreshFormState();
    };
    area.append(input, btn);
  } else {
    const tag = document.createElement("span");
    tag.className = "pill";
    tag.textContent = user.email;
    const out = document.createElement("button");
    out.className = "btn ghost";
    out.textContent = "Sign Out";
    out.onclick = () => {
      store.signOut();
      editId = null;
      photoDataUrl = "";
      renderAuth();
      refreshFormState();
      render();
    };
    area.append(tag, out);
  }
}

// --- Form state ---
function refreshFormState() {
  const user = store.getUser();
  const disabled = !user;
  [
    "title",
    "price",
    "make",
    "model",
    "year",
    "mileage",
    "condition",
    "location",
    "photo",
    "description",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = disabled;
    }
  });
  $("#postBtn").disabled = disabled;
  $("#cancelEditBtn").classList.toggle("hide", !editId);
  $("#postHint").textContent = disabled
    ? "Sign in with your .edu email to post."
    : editId
    ? "Editing this listing"
    : "";
}

// --- Load photo preview ---
$("#photo").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    photoDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// --- Create or Update listing ---
$("#postBtn").addEventListener("click", () => {
  const user = store.getUser();
  if (!user) {
    alert("Sign in first");
    return;
  }
  const data = {
    title: $("#title").value.trim(),
    price: Number($("#price").value || 0),
    make: $("#make").value.trim(),
    model: $("#model").value.trim(),
    year: Number($("#year").value || 0),
    mileage: Number($("#mileage").value || 0),
    condition: $("#condition").value,
    location: $("#location").value.trim(),
    description: $("#description").value.trim(),
  };
  if (!data.title || !data.price || !data.make || !data.model || !data.year) {
    alert("Please fill in title, price, make, model, and year.");
    return;
  }
  const all = store.getListings();
  if (editId) {
    const idx = all.findIndex((x) => x.id === editId);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        ...data,
        photoDataUrl: photoDataUrl || all[idx].photoDataUrl,
        updatedAt: Date.now(),
      };
    }
    store.setListings(all);
    clearForm();
    editId = null;
  } else {
    const item = {
      id: uid(),
      ownerEmail: user.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isSold: false,
      photoDataUrl,
      ...data,
    };
    all.unshift(item);
    store.setListings(all);
    clearForm();
  }
  render();
});

$("#cancelEditBtn").addEventListener("click", () => {
  editId = null;
  clearForm();
  refreshFormState();
});

function clearForm() {
  [
    "title",
    "price",
    "make",
    "model",
    "year",
    "mileage",
    "condition",
    "location",
    "photo",
    "description",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else if (el.type === "file") {
      el.value = "";
    } else {
      el.value = "";
    }
  });
  photoDataUrl = "";
  $("#postHint").textContent = "";
}

// --- Filters ---
$("#applyFilters").addEventListener("click", render);
$("#clearFilters").addEventListener("click", () => {
  $("#q").value = "";
  $("#minPrice").value = "";
  $("#maxPrice").value = "";
  render();
});

function applyFilter(list) {
  const q = $("#q").value.trim().toLowerCase();
  const min = Number($("#minPrice").value || 0);
  const max = Number($("#maxPrice").value || 0);
  return list.filter((x) => {
    const text = (x.title + " " + x.make + " " + x.model).toLowerCase();
    const inText = q ? text.includes(q) : true;
    const inMin = min ? x.price >= min : true;
    const inMax = max ? x.price <= max : true;
    return inText && inMin && inMax;
  });
}

// --- Render grid ---
function render() {
  const grid = $("#grid");
  const user = store.getUser();
  let list = store.getListings();
  list = applyFilter(list);
  $("#count").textContent = list.length
    ? list.length + " results"
    : "No results";
  grid.innerHTML = "";
  list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.src =
      item.photoDataUrl ||
      "data:image/svg+xml;utf8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="#0b1020"/><text x="50%" y="50%" fill="#9fb3d9" font-family="Arial" font-size="22" text-anchor="middle">No Photo</text></svg>`
        );
    const pad = document.createElement("div");
    pad.className = "pad";
    const title = document.createElement("div");
    title.style.fontWeight = "800";
    title.textContent = item.title;
    const price = document.createElement("div");
    price.className = "muted";
    price.textContent = `$${item.price.toLocaleString()} • ${item.mileage.toLocaleString()} mi • ${
      item.condition || "—"
    }`;
    const loc = document.createElement("div");
    loc.className = "muted small";
    loc.textContent = item.location || "Near campus";
    const actions = document.createElement("div");
    actions.className = "actions";
    const email = document.createElement("a");
    email.href = `mailto:${item.ownerEmail}?subject=${encodeURIComponent(
      "Inquiry: " + item.title
    )}`;
    email.textContent = "Email Seller";
    actions.append(email);
    if (user && user.email === item.ownerEmail) {
      const edit = document.createElement("button");
      edit.className = "btn ghost small";
      edit.textContent = "Edit";
      edit.onclick = () => {
        editId = item.id;
        $("#title").value = item.title;
        $("#price").value = item.price;
        $("#make").value = item.make;
        $("#model").value = item.model;
        $("#year").value = item.year;
        $("#mileage").value = item.mileage;
        $("#condition").value = item.condition || "";
        $("#location").value = item.location || "";
        $("#description").value = item.description || "";
        photoDataUrl = item.photoDataUrl || "";
        refreshFormState();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      const del = document.createElement("button");
      del.className = "btn ghost small";
      del.textContent = "Delete";
      del.onclick = () => {
        if (confirm("Delete this listing?")) {
          const all = store.getListings().filter((x) => x.id !== item.id);
          store.setListings(all);
          render();
        }
      };
      actions.append(edit, del);
    }
    pad.append(title, price, loc, actions);
    card.append(img, pad);
    grid.append(card);
  });
}

// --- init ---
renderAuth();
refreshFormState();
render();
