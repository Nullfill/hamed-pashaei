async function test() {
    const res = await fetch('https://st1105.gapfilm.ir/s/2025/4/67fce3b80087b28ba86e6166/c_x264_1920.mp4/chunk.m3u8?wmsAuthSign=c2VydmVyX3RpbWU9OS8yOS8yMDI2IDQ6MDc6NTAgUE0maGFzaF92YWx1ZT1sTzVUdW0rcDhGM0NUKzFneFMzYXZBPT0mdmFsaWRtaW51dGVzPTg2NDAwJnN0cm1fbGVuPTQ5&mk=8MKlk9CglarnvK63oHR5yA&si=0eed5866-9d2d-4bdf-9bdb-ba0bd5a9b330&sc=GF_DE_BE_40406&app=Web&ts=Gapfilm&cid=eHXaLChSN9');
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
test();
