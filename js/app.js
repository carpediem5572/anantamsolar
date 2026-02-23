const API_URL = "https://script.google.com/macros/s/AKfycbzrnf1jMEyetNF64mZns1ahyNOVLtByvG5t8vtTP4tsC0oavAdlZcNcEvRD3zmx5AhmAg/exec";

/* ================= UTILITIES ================= */

function showLoading() {
  const loader = document.getElementById("loadingOverlay");
  if (loader) loader.style.display = "flex";
}

function hideLoading() {
  const loader = document.getElementById("loadingOverlay");
  if (loader) loader.style.display = "none";
}

function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/* ================= LOGIN ================= */

document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  showLoading();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username,
        password
      })
    });

    const data = await res.json();

    if (data.status === "success") {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("adminName", username);
      window.location.href = "portal.html";
    } else {
      document.getElementById("errorMsg").innerText = "Invalid Login";
    }

  } catch (err) {
    console.error("Login Error:", err);
    showToast("Login error. Please try again.", "error");
  }

  hideLoading();
});

/* ================= PORTAL INIT ================= */

if (document.getElementById("adminName")) {
  document.getElementById("adminName").innerText =
    "Logged in: " + localStorage.getItem("adminName");

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("attendanceDate").value = today;

  document.getElementById("attendanceDate").addEventListener("change", () => {
    if (currentBuilding) loadStudentsFromSheet();
  });
}

/* ================= GLOBAL STATE ================= */

let currentHostel = "";
let currentBuilding = "";
let students = [];

/* ================= LOGOUT ================= */

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

/* ================= HOSTEL ================= */

function openHostel(hostel) {
  currentHostel = hostel;

  document.getElementById("hostelSelection").style.display = "none";
  document.getElementById("hostelSection").style.display = "block";

  document.getElementById("hostelTitle").innerText =
    hostel === "SBH" ? "Shivaji Boys Hostel" : "Shivaji Girls Hostel";

  loadBuildings();
}

/* ================= BUILDINGS ================= */

function loadBuildings() {
  const tabs = document.getElementById("buildingTabs");
  tabs.innerHTML = "";

  const buildingCount = currentHostel === "SBH" ? 6 : 2;

  for (let i = 1; i <= buildingCount; i++) {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.innerText = "Building " + i;
    tab.onclick = () => selectBuilding("Building " + i, tab);
    tabs.appendChild(tab);
  }
}

async function selectBuilding(building, element) {
  currentBuilding = building;

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  element.classList.add("active");

  await loadStudentsFromSheet();
}

/* ================= LOAD STUDENTS ================= */

async function loadStudentsFromSheet() {
  const list = document.getElementById("attendanceList");
  const skeleton = document.getElementById("skeletonLoader");

  list.style.display = "none";
  skeleton.style.display = "flex";

  const date = document.getElementById("attendanceDate").value;

  try {
    const [studentsRes, attendanceRes] = await Promise.all([
      fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "getStudents",
          hostel: currentHostel,
          building: currentBuilding
        })
      }),
      fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "getAttendance",
          hostel: currentHostel,
          building: currentBuilding,
          date
        })
      })
    ]);

    if (!studentsRes.ok || !attendanceRes.ok) {
      throw new Error(`HTTP Error: ${studentsRes.status} / ${attendanceRes.status}`);
    }

    const studentsData = await studentsRes.json();
    if (!Array.isArray(studentsData)) {
      throw new Error("Invalid students data format");
    }

    let attendanceData = [];
    try {
      attendanceData = await attendanceRes.json();
    } catch (e) {
      console.warn("No previous attendance or error parsing it:", e);
    }

    students = studentsData.map(s => {
      const found = Array.isArray(attendanceData) ? attendanceData.find(a => a.hostelNo === s.hostelNo) : null;
      return {
        ...s,
        status: found ? found.status : ""
      };
    });

    renderStudents();

  } catch (err) {
    console.error("Load Error:", err);
    showToast("Error loading students. Please check your connection.", "error");
  } finally {
    list.style.display = "grid";
    skeleton.style.display = "none";
  }
}

/* ================= RENDER ================= */

function renderStudents() {
  const list = document.getElementById("attendanceList");
  list.innerHTML = "";

  let present = 0;
  let absent = 0;

  students.forEach((s, index) => {

    if (s.status === "Present") present++;
    if (s.status === "Absent") absent++;

    const div = document.createElement("div");
    div.className = "student-card";

    div.innerHTML = `
      <div class="student-info">
        <b>${s.hostelNo}</b>
        <span>${s.name}</span>
      </div>
      <div class="student-actions">
        <button class="status-btn ${s.status === "Present" ? "present active" : ""}"
          onclick="markStatus(${index}, 'Present')">
          Present
        </button>

        <button class="status-btn ${s.status === "Absent" ? "absent active" : ""}"
          onclick="markStatus(${index}, 'Absent')">
          Absent
        </button>

        <button class="remove-btn" 
          onclick="removeStudent('${s.hostelNo}')" title="Remove Student">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    list.appendChild(div);
  });

  if (window.lucide) {
    lucide.createIcons();
  }

  document.getElementById("totalCount").innerText = students.length;
  document.getElementById("presentCount").innerText = present;
  document.getElementById("absentCount").innerText = absent;
}

/* ================= MARK STATUS ================= */

function markStatus(index, status) {
  students[index].status = status;
  renderStudents();
}

/* ================= ADD STUDENT ================= */

function openAddStudent() {
  document.getElementById("addStudentModal").style.display = "flex";

  const dropdown = document.getElementById("newBuilding");
  dropdown.innerHTML = "";

  const buildingCount = currentHostel === "SBH" ? 6 : 2;

  for (let i = 1; i <= buildingCount; i++) {
    const option = document.createElement("option");
    option.value = "Building " + i;
    option.innerText = "Building " + i;
    dropdown.appendChild(option);
  }
}

function closeAddStudent() {
  document.getElementById("addStudentModal").style.display = "none";
}

async function saveStudent() {
  const hostelNo = document.getElementById("newHostelNo").value.trim();
  const name = document.getElementById("newStudentName").value.trim();
  const building = document.getElementById("newBuilding").value;

  if (!hostelNo || !name) {
    showToast("Please fill all fields", "warning");
    return;
  }

  // Optimistic UI Update if adding to current building
  let originalStudents = [...students];
  if (building === currentBuilding) {
    students.push({ hostelNo, name, status: "" });
    renderStudents();
  }

  showToast("Adding student...", "warning");
  closeAddStudent();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addStudent",
        hostel: currentHostel,
        building,
        hostelNo,
        name
      })
    });

    const data = await res.json();
    if (data.status !== "success") throw new Error("API failed");

    showToast("Student Added Successfully", "success");

    // Clear fields
    document.getElementById("newHostelNo").value = "";
    document.getElementById("newStudentName").value = "";
  } catch (err) {
    console.error("Add Error:", err);
    // Revert state if it was added to current building
    if (building === currentBuilding) {
      students = originalStudents;
      renderStudents();
    }
    showToast("Error adding student. Please try again.", "error");
    openAddStudent(); // Re-open to allow fixing
  }
}

/* ================= REMOVE STUDENT ================= */

async function removeStudent(hostelNo) {
  if (!confirm("Are you sure you want to remove this student?")) return;

  // Optimistic UI Update
  const originalStudents = [...students];
  students = students.filter(s => s.hostelNo !== hostelNo);
  renderStudents();

  // Show a non-blocking notification
  showToast("Removing student...", "warning");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "removeStudent",
        hostel: currentHostel,
        building: currentBuilding,
        hostelNo
      })
    });

    const data = await res.json();
    if (data.status !== "success") throw new Error("API failed");

    showToast("Student Removed Successfully", "success");
  } catch (err) {
    console.error("Remove Error:", err);
    // Revert state on failure
    students = originalStudents;
    renderStudents();
    showToast("Error removing student. Please try again.", "error");
  }
}

/* ================= SAVE ATTENDANCE ================= */

async function saveAttendance() {
  if (!currentBuilding) {
    showToast("Please select a building", "warning");
    return;
  }

  const unmarked = students.filter(s => s.status === "");
  if (unmarked.length > 0) {
    showToast("Please mark attendance for all students.", "warning");
    return;
  }

  showToast("Saving attendance...", "warning");

  const date = document.getElementById("attendanceDate").value;
  const markedBy = localStorage.getItem("adminName");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveAttendance",
        hostel: currentHostel,
        building: currentBuilding,
        date,
        markedBy,
        records: students
      })
    });

    const data = await res.json();
    if (data.status !== "success") throw new Error("API failed");

    showToast("Attendance Saved Successfully", "success");
  } catch (err) {
    console.error("Save Attendance Error:", err);
    showToast("Error saving attendance. Please try again.", "error");
  }
}

/* ================= BACK ================= */

function goBack() {
  currentHostel = "";
  currentBuilding = "";
  students = [];

  document.getElementById("hostelSection").style.display = "none";
  document.getElementById("hostelSelection").style.display = "flex";
}
