async function test() {
    const res = await fetch('https://core.gapfilm.ir/api/file/stream/837153/6ab8cdf65740c682a2521e5e/chunk.m3u8', {
        headers: {
            'PlatformType': 'Web',
            'SourceEnvironment': 'Website',
            'X-Forwarded-For': '5.52.12.34',
            'X-Real-IP': '5.52.12.34',
            'Client-IP': '5.52.12.34'
        }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text.substring(0, 1000));
}
test();
