import type { ProductShareItem } from "@/lib/sharing/product-share";

export type CrewDesignProduct = ProductShareItem & { image: string; retailer: string; note?: string };
export type DesignMember = { id: string; name: string; photo: string | null; sample?: boolean; category?: string };
export type CrewDesignProps = {
  initialDesign: number;
  members: DesignMember[];
  ownProducts: CrewDesignProduct[];
  automotive: CrewDesignProduct | null;
  available: boolean;
  pendingRequests: number;
};

export const crewDesigns = [
  { id: 1, name: "Connected tickets", group: "Familiar", short: "Connected", description: "Your people and their picks share one connected space.", strength: "Closest to your current page, with a much clearer connection." },
  { id: 2, name: "People & picks", group: "Familiar", short: "Split view", description: "A people list beside the selected person’s shared picks.", strength: "Fast switching on desktop; a swipeable people strip on phones." },
  { id: 3, name: "The Crew feed", group: "Familiar", short: "Crew feed", description: "See what everyone shared, with the person attached to every find.", strength: "Content is visible immediately. People become filters, not a hurdle." },
  { id: 4, name: "Friend shelves", group: "Familiar", short: "Shelves", description: "Each friend gets a small shelf of things they’ve shared.", strength: "Browse several friends without opening and closing profiles." },
  { id: 5, name: "In the spotlight", group: "Experimental", short: "Spotlight", description: "A person and their favorite find take the stage together.", strength: "More personality, larger artwork, and a visible next person." },
  { id: 6, name: "The picks inbox", group: "Experimental", short: "Picks inbox", description: "Shared finds read like a conversation with each person.", strength: "A familiar inbox rhythm, without introducing a chat feature." },
  { id: 7, name: "The sharing desk", group: "Unexpected", short: "Share first", description: "Start with something worth sharing. Your people come next.", strength: "Puts the reason to invite someone ahead of managing friends." },
  { id: 8, name: "Discover people", group: "Unexpected", short: "Discover", description: "Find active creators by interest—even if you never invite a friend.", strength: "Public follows and category discovery, separate from personal Crew." },
] as const;

export const creatorCategories = ["Tech", "Home", "Style", "Automotive", "Everyday"] as const;
