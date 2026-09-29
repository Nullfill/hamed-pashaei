async function test() {
    const res = await fetch('https://film-nine-ruby.vercel.app/api/home?limit=50', {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Sections count:", json.sections?.length);
    json.sections?.forEach(s => console.log(`[${s.provider}] ${s.title}`));
}
test();
