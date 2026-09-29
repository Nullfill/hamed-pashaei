async function test() {
    const res = await fetch('https://film-nine-ruby.vercel.app/api/provider-media?url=' + encodeURIComponent('https://core.gapfilm.ir/api/file/stream/837153/6ab8cdf65740c682a2521e5e/chunk.m3u8'));
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text.substring(0, 1000));
}
test();
