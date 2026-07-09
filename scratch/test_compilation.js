async function check() {
  console.log("Checking http://localhost:3000/src/App.tsx...");
  try {
    const res = await fetch("http://localhost:3000/src/App.tsx");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Snippet:", text.substring(0, 1000));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();
