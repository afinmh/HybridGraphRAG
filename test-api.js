async function test() {
  const dummyVec = Array(384).fill(0.001);
  const res = await fetch("http://localhost:3000/api/query-with-embedding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: "headache treatment",
      embedding: dummyVec,
      topK: 2,
      language: "en"
    })
  });
  
  if (!res.ok) {
    console.log("Error:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Vector results:");
  data.vectorResults.slice(0,2).forEach((v, i) => {
    console.log(`${i+1}. chunk_id: ${v.id}, journal_id: ${v.journal_id}`);
    console.log(`   journal:`, v.journal);
  });
}

test();
