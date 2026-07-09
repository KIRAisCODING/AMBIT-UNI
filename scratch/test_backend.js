async function check() {
  console.log("Checking http://127.0.0.1:3000/...");
  try {
    const res = await fetch("http://127.0.0.1:3000/");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Snippet:", text.substring(0, 200));
  } catch (err) {
    console.error("Error:", err.message);
  }

  console.log("\nChecking http://localhost:3000/...");
  try {
    const res = await fetch("http://localhost:3000/");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Snippet:", text.substring(0, 200));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();
