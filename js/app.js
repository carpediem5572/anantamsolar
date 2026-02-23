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
    alert("Login error. Please try again.");
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
  showLoading();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getStudents",
        hostel: currentHostel,
        building: currentBuilding
      })
    });

    students = await res.json();

    // Default status EMPTY (not marked)
    students = students.map(s => ({
      ...s,
      status: ""
    }));

    await loadAttendanceForDate();
    renderStudents();

  } catch (err) {
    alert("Error loading students");
  }

  hideLoading();
}

/* ================= LOAD PAST ATTENDANCE ================= */

async function loadAttendanceForDate() {
  const date = document.getElementById("attendanceDate").value;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getAttendance",
        hostel: currentHostel,
        building: currentBuilding,
        date
      })
    });

    const attendance = await res.json();

    if (attendance.length > 0) {
      students = students.map(student => {
        const found = attendance.find(a => a.hostelNo === student.hostelNo);
        if (found) {
          return { ...student, status: found.status };
        }
        return student;
      });
    }

  } catch (err) {
    console.log("No previous attendance");
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
      <div>
        <b>${s.hostelNo}</b><br>
        ${s.name}
      </div>
      <div>
        <button class="status-btn ${s.status === "Present" ? "present" : ""}" 
          onclick="markStatus(${index}, 'Present')">
          Present
        </button>

        <button class="status-btn ${s.status === "Absent" ? "absent" : ""}" 
          onclick="markStatus(${index}, 'Absent')">
          Absent
        </button>

        <button class="remove-btn" 
          onclick="removeStudent('${s.hostelNo}')">
          Remove
        </button>
      </div>
    `;

    list.appendChild(div);
  });

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
    alert("Please fill all fields");
    return;
  }

  showLoading();

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "addStudent",
      hostel: currentHostel,
      building,
      hostelNo,
      name
    })
  });

  hideLoading();

  alert("Student Added Successfully");

  closeAddStudent();
  await loadStudentsFromSheet();
}

/* ================= REMOVE STUDENT ================= */

async function removeStudent(hostelNo) {
  if (!confirm("Are you sure you want to remove this student?")) return;

  showLoading();

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "removeStudent",
      hostel: currentHostel,
      building: currentBuilding,
      hostelNo
    })
  });

  hideLoading();

  alert("Student Removed Successfully");
  await loadStudentsFromSheet();
}

/* ================= SAVE ATTENDANCE ================= */

async function saveAttendance() {

  if (!currentBuilding) {
    alert("Please select a building");
    return;
  }

  const unmarked = students.filter(s => s.status === "");
  if (unmarked.length > 0) {
    alert("Please mark attendance for all students.");
    return;
  }

  showLoading();

  const date = document.getElementById("attendanceDate").value;
  const markedBy = localStorage.getItem("adminName");

  await fetch(API_URL, {
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

  hideLoading();

  alert("Attendance Saved Successfully");
}

/* ================= BACK ================= */

function goBack() {
  currentHostel = "";
  currentBuilding = "";
  students = [];

  document.getElementById("hostelSection").style.display = "none";
  document.getElementById("hostelSelection").style.display = "flex";
}
