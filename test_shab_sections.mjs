async function test() {
    const res = await fetch('https://shabforoosh.ir/wp-json/mapi/v1/post/all', {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    const payload = await res.json();
    const sections = payload.data?.sections || [];
    
    sections.forEach(section => {
        console.log("Section:", section.title, "Key:", section.key, "Items:", section.items?.length);
    });
}
test();
