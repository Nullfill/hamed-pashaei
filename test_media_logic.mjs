async function test() {
    const targetUrl = 'https://core.gapfilm.ir/api/file/stream/837153/6ab8cdf65740c682a2521e5e/chunk.m3u8';
    const response = await fetch(targetUrl, {
      headers: {
        Accept: "application/vnd.apple.mpegurl,*/*",
        Referer: "https://www.gapfilm.ir/",
        Origin: "https://www.gapfilm.ir",
        PlatformType: "Web",
        SourceEnvironment: "Website",
        "X-Forwarded-For": "5.52.12.34",
        "X-Real-IP": "5.52.12.34",
        "Client-IP": "5.52.12.34",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    console.log(response.status);
    console.log(await response.text());
}
test();
