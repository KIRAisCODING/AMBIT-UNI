async function check() {
  try {
    const res = await fetch("http://localhost:3055/api/health");
    console.log("Health check status:", res.status);
    console.log("Health check body:", await res.json());
  } catch (err) {
    console.error("Health check failed:", err.message);
  }
}
check();
