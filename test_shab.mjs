async function test() {
    const res = await fetch('https://shabforoosh.ir/wp-json/mapi/v1/post/all', {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text.substring(0, 1000));
}
test();
