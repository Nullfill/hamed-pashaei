import { ShabforooshProvider } from './src/lib/providers/shabforoosh/index.ts';

async function test() {
    const provider = new ShabforooshProvider();
    try {
        const sections = await provider.getHomeSections();
        console.log("Sections count:", sections.length);
        console.log("Sections:", JSON.stringify(sections.map(s => s.title)));
    } catch(e) {
        console.error("Error:", e);
    }
}
test();
