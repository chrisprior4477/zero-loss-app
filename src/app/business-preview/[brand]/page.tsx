import Link from "next/link";
import Image from "next/image";
import { businessCampaignDestination, businessCampaigns, type CampaignKey } from "@/lib/business/demo-campaigns";
import { notFound } from "next/navigation";

const catalogs = {
  "forge-field": { name: "Forge & Field Supply", category: "Tools", image: "/business-demo/forge-field-originals.png", names: ["Cordless drill kit","Professional wrench set","Portable jobsite table saw","Telescoping work lantern","Rolling tool chest","Wet-dry shop vacuum","Angle grinder kit","Mechanic socket set","Heavy-duty workbench","Portable power station"], values: [199,129,899,89,749,159,139,219,499,699] },
  bellamora: { name: "Bellamora Italian Kitchen", category: "Dining", image: "/business-demo/bellamora-originals.png", names: ["Spaghetti & meatballs dinner","Chicken parmesan dinner","Seafood linguine dinner","Wood-fired pizza night","Bellamora lasagna dinner","Tiramisu dessert experience","Antipasto tasting for two","Warm bread & olive oil tasting","Chef's table dinner for two","$150 Bellamora dining card"], values: [72,78,92,65,76,48,58,42,225,150] },
} as const;

const campaigns = Object.entries(businessCampaigns).filter(([key]) => key !== "tools" && key !== "restaurant");
export function generateStaticParams() {
  return [...Object.keys(catalogs), ...campaigns.map(([key]) => businessCampaignDestination(key as CampaignKey))].map(brand => ({ brand }));
}

export default async function BusinessPreviewPage({ params }: PageProps<"/business-preview/[brand]">) {
  const { brand } = await params;
  const catalog = catalogs[brand as keyof typeof catalogs];
  if (!catalog) {
    const example = campaigns.find(([key]) => key === brand || businessCampaignDestination(key as CampaignKey) === brand)?.[1];
    if (!example) notFound();
    return <div className="min-h-screen bg-[#001b3d] px-4 py-10 text-white sm:px-8">
      <article className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        <Image src={`/business-demo/${example.generated}`} alt="" width={768} height={768} className="w-full rounded-2xl object-contain" />
        <div className="self-center">
          <p className="text-sm font-bold text-cyan-200">Zero Loss partner campaign · Demonstration</p>
          <h1 className="mt-3 text-4xl font-black">{example.brand}</h1>
          <p className="mt-3 text-2xl font-bold">{example.title}</p>
          <p className="mt-3">{example.reward} · {example.value} value</p>
          <p className="mt-5 text-white/75">Sample campaign. Entries and purchases are unavailable.</p>
          <Link href="/browse" className="mt-6 inline-block font-bold text-cyan-200 underline">Browse the marketplace →</Link>
        </div>
      </article>
    </div>;
  }
  return <div className="min-h-screen bg-[#001b3d] px-4 py-10 text-white sm:px-8"><div className="mx-auto max-w-6xl"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">Zero Loss partner collection · Demonstration</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">{catalog.name}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-white/65">Every offering below has its own value, $1 entry, capacity, specifications, availability, and fulfillment terms. Select an item to inspect its complete listing information.</p><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{catalog.names.map((name,index) => { const column=index%5; const row=Math.floor(index/5); const value=catalog.values[index]; return <article key={name} className="overflow-hidden rounded-3xl bg-white p-4 text-[#00132e] shadow-xl"><div className="h-56 rounded-2xl bg-cover bg-no-repeat" style={{backgroundImage:`url(${catalog.image})`,backgroundSize:"560% 224%",backgroundPosition:`${column*25}% ${row*100}%`}}/><p className="mt-4 text-xs font-black uppercase tracking-[.14em] text-[#005e85]">{catalog.category}</p><h2 className="mt-2 text-xl font-black">{name}</h2><div className="mt-4 flex justify-between border-t border-black/10 pt-4"><span>${value} value</span><strong>Enter for $1</strong></div><details className="mt-4 rounded-xl bg-[#eef8ff] p-4"><summary className="cursor-pointer font-black">View complete listing</summary><p className="mt-3 text-sm leading-6 text-black/65">A complete {catalog.name} offering with verified item details, inventory, and partner-managed fulfillment.</p><dl className="mt-3 divide-y divide-black/10 text-sm"><div className="flex justify-between py-2"><dt>Entry capacity</dt><dd className="font-bold">{(value*3).toLocaleString()}</dd></div><div className="flex justify-between py-2"><dt>Condition</dt><dd className="font-bold">New</dd></div><div className="flex justify-between py-2"><dt>Fulfillment</dt><dd className="text-right font-bold">Partner supplied</dd></div><div className="flex justify-between py-2"><dt>Availability</dt><dd className="text-right font-bold">Confirmed before launch</dd></div></dl><button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-[#eef8ff] px-4 py-3 font-bold text-[#31536d]">Entries unavailable in this preview</button></details></article>; })}</div><p className="mt-10 rounded-2xl border border-orange-300/25 bg-orange-300/10 p-5 text-sm leading-6 text-orange-50">Demonstration collection only. No active entry, purchase, inventory reservation, or approved partner campaign is created.</p></div></div>;
}
