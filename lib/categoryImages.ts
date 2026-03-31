export function getCategoryImageUrl(category: string): string {
  const map: Record<string, string> = {
    "juices & smoothies": "https://i.ibb.co/VYwTGt0T/juicessmoothies.png",
    "waters & drinks": "https://i.ibb.co/DDL279Dk/watersdrinks.png",
    "weight loss & cleanses": "https://i.ibb.co/TB5rTzQv/weightlosscleanses.png",
    "targeted detox": "https://i.ibb.co/gLWzWqQ6/targeteddetox.png",
    "detox baths": "https://i.ibb.co/BHPCHKMY/detoxbaths.png",
    "soups & meals": "https://i.ibb.co/KjnNx9Xm/soupsmeals.png"
  };
  
  const normalizedCategory = category.toLowerCase().trim();
  const imageUrl = map[normalizedCategory];
  
  return imageUrl || "https://picsum.photos/seed/detox/800/600";
}
