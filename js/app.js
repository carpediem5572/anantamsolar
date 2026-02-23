document.getElementById("loginForm")?.addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");

  // Temporary static login
  if (username === "admin" && password === "1234") {
    
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("adminName", username);

    window.location.href = "portal.html";
  } else {
    errorMsg.textContent = "Invalid username or password";
  }
});
