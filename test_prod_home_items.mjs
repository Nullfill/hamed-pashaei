async function test() {
    const res = await fetch('https://film-nine-ruby.vercel.app/api/home?limit=5', {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    const json = await res.json();
    const shab = json.sections?.find(s => s.provider === 'shabforoosh');
    console.log("Shabforoosh Section:", shab?.title);
    console.log("Items count:", shab?.items?.length);
    if (shab?.items?.length > 0) {
        console.log("First item:", shab.items[0]);
    }
}
test();
