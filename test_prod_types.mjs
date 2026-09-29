async function test() {
    const res = await fetch('https://film-nine-ruby.vercel.app/api/home?limit=5', {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    const json = await res.json();
    json.sections?.filter(s => s.provider === 'shabforoosh').forEach(s => {
        console.log(`[${s.provider}] ${s.title} (type: ${s.type})`);
    });
}
test();
