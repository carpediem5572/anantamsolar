const API_URL = "https://script.google.com/macros/s/AKfycbzrnf1jMEyetNF64mZns1ahyNOVLtByvG5t8vtTP4tsC0oavAdlZcNcEvRD3zmx5AhmAg/exec";
document.getElementById("loginForm")?.addEventListener("submit", async function(e){
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

// Show Admin Name
document.getElementById("adminName") && 
(document.getElementById("adminName").innerText = 
"Logged in: " + localStorage.getItem("adminName"));

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

let currentHostel = "";
let currentBuilding = "";
let students = [];

function openHostel(hostel) {
  currentHostel = hostel;
  document.getElementById("hostelSelection").style.display = "none";
  document.getElementById("hostelSection").style.display = "block";
  document.getElementById("hostelTitle").innerText =
    hostel === "SBH" ? "Shivaji Boys Hostel" : "Shivaji Girls Hostel";

  loadBuildings();
}

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

function selectBuilding(building, element) {
  currentBuilding = building;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  element.classList.add("active");

  loadDummyStudents(); // temporary
}

function loadDummyStudents() {
  students = [
    { hostelNo: "101", name: "Rahul Patel", status: "Present" },
    { hostelNo: "102", name: "Amit Shah", status: "Absent" }
  ];
  renderStudents();
}

function renderStudents() {
  const list = document.getElementById("attendanceList");
  list.innerHTML = "";
  let present = 0, absent = 0;

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
        <button class="status-btn present" onclick="markStatus(${index}, 'Present')">P</button>
        <button class="status-btn absent" onclick="markStatus(${index}, 'Absent')">A</button>
      </div>
    `;
    list.appendChild(div);
  });

  document.getElementById("totalCount").innerText = students.length;
  document.getElementById("presentCount").innerText = present;
  document.getElementById("absentCount").innerText = absent;
}

function markStatus(index, status) {
  students[index].status = status;
  renderStudents();
}

function openAddStudent() {
  document.getElementById("addStudentModal").style.display = "flex";
}

function closeAddStudent() {
  document.getElementById("addStudentModal").style.display = "none";
}

function saveStudent() {
  const no = document.getElementById("newHostelNo").value;
  const name = document.getElementById("newStudentName").value;

  students.push({ hostelNo: no, name: name, status: "Present" });
  renderStudents();
  closeAddStudent();
}

async function saveAttendance() {
  const date = document.getElementById("attendanceDate").value;
  const markedBy = localStorage.getItem("adminName");

  const records = students.map(s => ({
    hostelNo: s.hostelNo,
    name: s.name,
    status: s.status
  }));

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "saveAttendance",
      hostel: currentHostel,
      building: currentBuilding,
      date,
      markedBy,
      records
    })
  });

  alert("Attendance Saved Successfully");
}
