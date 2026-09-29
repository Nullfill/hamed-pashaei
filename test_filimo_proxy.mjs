import fs from 'fs';

async function test() {
    const fetchUrl = 'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=' + encodeURIComponent('https://www.filimo.com/api/fa/v1/movie/watch/watch/uid/g1vfz');
    const res = await fetch(fetchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.filimo.com/',
        }
    });
    console.log(res.status);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}
test();
