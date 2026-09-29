async function test() {
    const targetUrl = 'https://core.gapfilm.ir/api/v4/Content/GetContentAttachments?Id=31474&SeasonId=1';
    const proxyUrl = 'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=' + encodeURIComponent(targetUrl);
    
    const res = await fetch(proxyUrl, {
        headers: {
            'PlatformType': 'Web',
            'SourceEnvironment': 'Website',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDdXN0b21lcklkIjoiMzg0NDE1NCIsIklzR3Vlc3QiOiIwIiwiSXNMb2dnZWRJbiI6IjEiLCJ0aWQiOiJHYXBmaWxtIiwiZXhwIjoyMTA2MzE2MDAxLCJpc3MiOiJodHRwczovL2dhcGZpbG0uaXIiLCJhdWQiOiJodHRwczovL2dhcGZpbG0uaXIifQ.IobXm7-_AQeEvPOPGkhC1Y0rR8MqU0G7kRh0-GYyJDE',
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
