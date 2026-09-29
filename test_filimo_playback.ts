import { FilimoProvider } from './src/lib/providers/filimo/index.ts';

async function test() {
    const provider = new FilimoProvider();
    // Filimo movie id: g1vfz
    const playback = await provider.getPlayback({
        id: 'g1vfz',
        type: 'movie',
        dubbed: '0'
    });
    console.log(playback);
}
test();
