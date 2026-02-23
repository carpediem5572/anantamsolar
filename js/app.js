const API_URL = "https://script.google.com/macros/s/AKfycbzrnf1jMEyetNF64mZns1ahyNOVLtByvG5t8vtTP4tsC0oavAdlZcNcEvRD3zmx5AhmAg/exec";

/* ================= LOGIN ================= */

document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

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
});

/* ================= PORTAL INIT ================= */

if (document.getElementById("adminName")) {
  document.getElementById("adminName").innerText =
    "Logged in: " + localStorage.getItem("adminName");

  // Set today date default
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("attendanceDate").value = today;
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
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "getStudents",
      hostel: currentHostel,
      building: currentBuilding
    })
  });

  students = await res.json();

  // Default status Present
  students = students.map(s => ({
    ...s,
    status: "Present"
  }));

  await loadAttendanceForDate();
  renderStudents();
}

/* ================= LOAD PAST ATTENDANCE ================= */

async function loadAttendanceForDate() {
  const date = document.getElementById("attendanceDate").value;

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
}

/* ================= RENDER ================= */

function renderStudents() {
  const list = document.getElementById("attendanceList");
  list.innerHTML = "";

  let present = 0;
  let absent = 0;

  students.forEach((s, index) => {
    if (s.status === "Present") present++;
    else absent++;

    const div = document.createElement("div");
    div.className = "student-card";
    div.innerHTML = `
      <div>
        <b>${s.hostelNo}</b><br>
        ${s.name}
      </div>
      <div>
        <button class="status-btn ${s.status === "Present" ? "present" : ""}" 
          onclick="markStatus(${index}, 'Present')">P</button>
        <button class="status-btn ${s.status === "Absent" ? "absent" : ""}" 
          onclick="markStatus(${index}, 'Absent')">A</button>
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
  const hostelNo = document.getElementById("newHostelNo").value;
  const name = document.getElementById("newStudentName").value;
  const building = document.getElementById("newBuilding").value;

  if (!hostelNo || !name) {
    alert("Please fill all fields");
    return;
  }

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

  closeAddStudent();
  await loadStudentsFromSheet();
}

/* ================= SAVE ATTENDANCE ================= */

async function saveAttendance() {
  const date = document.getElementById("attendanceDate").value;
  const markedBy = localStorage.getItem("adminName");

  if (!currentBuilding) {
    alert("Please select a building");
    return;
  }

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

  alert("Attendance Saved Successfully");
}

function goBack() {
  currentHostel = "";
  currentBuilding = "";
  students = [];

  document.getElementById("hostelSection").style.display = "none";
  document.getElementById("hostelSelection").style.display = "flex";
}
