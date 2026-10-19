// Public provider artwork inventory. No account, redemption, or payment endpoints.
import { JSDOM } from 'jsdom';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { giftCardPartnerGroups } from '../src/lib/catalog/gift-card-partners.ts';

const source = 'https://www.giftcardpartners.com/shop-brands-15';
const response = await fetch(source);
if (!response.ok) throw new Error(`Catalog: ${response.status}`);
const document = new JSDOM(await response.text()).window.document;
const cards = [...document.querySelectorAll('a.card')].map(card => ({
  name: card.querySelector('.card-name')?.textContent.trim(),
  sourceUrl: new URL(card.getAttribute('href'), source).href,
  imageUrl: card.querySelector('.card-logo')?.getAttribute('style')?.match(/url\(['"]?([^'")]+)/)?.[1],
})).filter(card => card.name && card.imageUrl && !/-cad(?:\?|$)|CAD_fp/i.test(`${card.sourceUrl} ${card.imageUrl}`));
const key = name => name.replace(/[®™]/g, '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  'Carter’s': "Carter's & Oshkosh",
  'Charity On Top – Disaster Relief': 'Charity On Top',
  '1-800-Baskets.com': '1-800 Baskets',
  '1-800-PetSupplies.com': '1-800-PetSupplies',
  'NetDragon': 'NetDragon Universal',
  'Sony PlayStation': 'Sony PlayStation Store',
  'P.C. Richard and Son': 'P.C. Richard & Son',
  'AMC Theaters': 'AMC Theatres',
  'Go Play Golf by Fairway Rewards': 'Go Play Golf',
  '99 Restaurant & Pubs': 'Ninety Nine Restaurant & Pub',
  'Auntie Anne’s – Mix It Up®': 'Auntie Anne’s – GoTo Foods',
  'Carvel – Mix It Up®': 'Carvel – GoTo Foods',
  'Cinnabon – Mix It Up®': 'Cinnabon – GoTo Foods',
  'Brinker International': 'Brinker',
  "Carrabba's": "Carrabba's Italian Grill",
  'Cracker Barrel': 'Cracker Barrel Old Country Store®',
  "Fleming's": "Fleming's Prime Steakhouse & Wine Bar",
  'Jamba Juice®': 'Jamba – Mix It Up®',
  'Krispy Kreme': 'Krispy Kreme® Doughnut Corporation',
  'Morton’s Steakhouse': "Morton's The Steakhouse",
  'Amazon': 'Amazon.com',
  'The Engage2Reward™ Choice Card': 'Engage2Reward Choice Card',
  'Carnival Cruise Lines': 'Carnival Cruises',
  'Disney Parks/Stores': 'Disney',
  'Golden Nugget': 'Golden Nugget Hotels & Casinos',
  'Princess Cruise Lines': 'Princess Cruises',
  'Southwest® Airlines': 'Southwest®',
  'XBOX Game Pass Essential': 'Xbox Game Pass Essential 1 Month Membership',
  'XBOX Game Pass Ultimate': 'Xbox Game Pass Ultimate 1 Month Membership',
  'Microsoft Office 365 Home': 'Microsoft Office 365 Home 1-yr Subscription',
  'GCodes® AT&T Prepaid Plans': 'GCodes® AT&T Prepaid Plan - $60 + $12 Taxes & Fees',
  'BarkBox': 'BarkBox 1 Month Gift',
  'Ube': 'Uber',
};
const vendors = [...new Set(giftCardPartnerGroups.filter(group => group.category !== 'Cryptocurrency').flatMap(group => group.brands))];
const matches = vendors.map(name => ({ name, card: cards.find(card => key(card.name) === key(aliases[name] ?? name))
  ?? cards.find(card => key(card.name.replace(/ \(Albertsons Alcohol\/Tobacco Restricted\)| \(Alcohol\/Tobacco Restricted\)/g, '')) === key(name)) }));
// URLs discovered in the provider's public sitemap, including older catalog entries.
const legacy = {
  "Bloomingdale's": 'bloomingdales-bulk-orders', 'GO Shop': 'go-shop-bulk-orders',
  'Sunglass Hut': 'sunglass-hut-bulk-orders', 'Albertsons Companies': 'albertsons-companies',
  'Kroger': 'kroger-dollar100', 'Meijer': 'meijer', 'Sheetz': 'sheetz',
  'Speedway': 'speedy-cash-speedway-bulk-orders', 'Vudu': 'vudu', 'StubHub': 'stubhub',
  'Arby’s': 'arbys', 'Bahama Breeze®': 'bahama-breeze', 'GO Eat': 'go-eat-bulk-orders',
  'GO Enjoy': 'go-enjoy-bulk-orders', 'Jimmy John’s': 'jimmy-johns', 'McDonald’s': 'mcdonalds',
  "O'Charley's": 'ocharleys', 'On The Border': 'on-the-border-mexican-grill-cantina',
  'Panda Express': 'panda-express', 'Schlotsky’s – Mix It Up®': 'schlotzskys-mix-it-up',
  'Zaxby’s': 'zaxbys', 'Menards®': 'menards', 'Petco': 'petco', 'eBay': 'ebay',
  'Spa Week': 'spa-and-wellness-gift-card-by-spa-week',
  'Fairmont Hotels & Resorts': 'fairmont-hotels-resorts', 'Raffles Hotels & Resorts': 'raffles-hotels-resorts',
  'Twitch': 'twitch',
};
for (let start = 0; start < matches.length; start += 8) {
  await Promise.all(matches.slice(start, start + 8).map(async match => {
    if (match.card || !legacy[match.name]) return;
    const sourceUrl = `https://www.giftcardpartners.com/order-gift-cards/${legacy[match.name]}`;
    const result = await fetch(sourceUrl);
    if (!result.ok) return;
    const doc = new JSDOM(await result.text()).window.document;
    const img = [...doc.querySelectorAll('img')].find(img => /GiftCardFaceplates/i.test(img.src));
    if (img) match.card = { name: img.alt, imageUrl: img.src, sourceUrl };
  }));
}
matches.find(match => match.name === 'Home Chef').card = {
  name: 'Home Chef',
  sourceUrl: 'https://www.giftcardpartners.com/blog/make-thanksgiving-simple-for-employees-with-home-chef-gift-cards',
  imageUrl: 'https://www.giftcardpartners.com/hs-fs/hubfs/home-chef-gift-card-300px.png?width=300&name=home-chef-gift-card-300px.png',
};
// Netflix is an existing vendor in "Other current offers", outside the directory.
matches.push({ name: 'Netflix', card: { name: 'Netflix',
  sourceUrl: 'https://www.target.com/p/-/A-52625513',
  imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_a17e924c-e8d0-43dc-89a5-4a26aca452f5',
} });
if (process.argv.includes('--write')) {
  const destination = new URL('../public/catalog/partner-cards/', import.meta.url);
  await mkdir(destination, { recursive: true });
  const previous = JSON.parse(await readFile(new URL('../src/lib/catalog/partner-card-art.json', import.meta.url), 'utf8').catch(() => '[]'));
  const manifest = [];
  for (let start = 0; start < matches.length; start += 8) {
    await Promise.all(matches.slice(start, start + 8).filter(match => match.card).map(async ({name, card}) => {
      const filename = `${key(name)}.webp`;
      const path = new URL(filename, destination);
      try {
        if (previous.find(item => item.name === name)?.imageUrl !== card.imageUrl) throw new Error('Updated source');
        await readFile(path);
      } catch {
        const image = await fetch(card.imageUrl);
        if (!image.ok) throw new Error(`${name}: image ${image.status}`);
        // Re-encode only; no manufactured artwork or denomination overlays.
        await sharp(Buffer.from(await image.arrayBuffer())).resize({width: 800, withoutEnlargement: true}).webp({quality: 92}).toFile(fileURLToPath(path));
      }
      manifest.push({ name, providerName: card.name, sourceUrl: card.sourceUrl, imageUrl: card.imageUrl,
        image: `/catalog/partner-cards/${filename}` });
    }));
  }
  manifest.sort((a,b) => a.name.localeCompare(b.name));
  await writeFile(new URL('../src/lib/catalog/partner-card-art.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
}
if (process.argv.includes('--names')) console.log(cards.map(card => card.name).join('\n'));
console.log(JSON.stringify({ vendors: vendors.length, providerCards: cards.length, matched: matches.filter(x => x.card).length,
  missing: matches.filter(x => !x.card).map(({name}) => ({name, candidates: cards.filter(card => {
    const words = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
    return words.some(word => card.name.toLowerCase().includes(word));
  }).map(card => card.name)}))
}, null, 2));
