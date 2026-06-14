document.addEventListener("keydown", function(e) {
  if (e.key === "F5") {
    e.preventDefault();
    window.location.href = "/";
  }
});