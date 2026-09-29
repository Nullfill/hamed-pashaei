async function test() {
    const res = await fetch('http://127.0.0.1:3000/api/playback?provider=filimo&type=movie&id=g1vfz');
    console.log("Status:", res.status);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}
test();
