import { categoryIconKey, type CategoryIconKey, type CategoryLike } from "@/lib/category-visual";
import type { Lang } from "@/lib/i18n";

/** BDI's category names in English. */
const EXACT: Record<string, string> = {
  "Нойтон салфетка": "Wet wipes",
  "Хөвөн": "Cotton pads",
  "Ам арчилгаа": "Oral care",
  "Наалтууд": "Patches",
  "Эко угаалгын ялтас": "Eco laundry sheets",
  "Гоймон": "Noodles",
  "Цаасан бүтээгдэхүүн": "Paper products",
  "Цэвэрлэгээ": "Cleaning",
  "Гоо сайхан": "Beauty",
  "Ариун цэврийн өрөөний иж бүрдэл": "Bathroom sets",
  "Ванны хөшиг": "Shower curtains",
  "Гал тогооны хос дэвсгэр": "Kitchen mats",
  "Бүс, тэлээ": "Belts",
  "Гал тогооны хэрэгсэл": "Kitchenware",
  "Цэвэрлэгээний робот": "Cleaning robots",
  "Массажер": "Massagers",
  "Утасны суурь": "Phone stands",
  "Гутал хамгаалагч": "Shoe covers",
  "Ариун цэврийн цаас": "Toilet paper",
  "Пролон спонж": "Sponges",
  "Хямдралтай": "On sale",
};

/** A category added later still gets a sensible English name from its picture. */
const BY_ICON: Partial<Record<CategoryIconKey, string>> = {
  wipes: "Wet wipes",
  tissue: "Tissues",
  "toilet-paper": "Toilet paper",
  sponge: "Sponges",
  cotton: "Cotton",
  toothbrush: "Oral care",
  patch: "Patches",
  cleaning: "Cleaning",
  laundry: "Laundry",
  beauty: "Beauty",
  pasta: "Food",
  bathroom: "Bathroom",
  shower: "Bath & shower",
  "kitchen-mat": "Kitchen",
  belt: "Belts",
  kitchen: "Kitchenware",
  robot: "Robots & tech",
  massage: "Massage",
  phone: "Phone accessories",
  shoe: "Shoes",
  air: "Air & hygiene",
  health: "Health",
  pill: "Vitamins",
  eco: "Eco",
  food: "Food",
  baby: "Kids",
  clothes: "Clothes",
  home: "Home",
  gift: "Gifts",
};

export function categoryName(cat: CategoryLike | null | undefined, lang: Lang): string {
  if (!cat) return "";
  if (lang === "mn") return cat.name;
  const name = cat.name.trim();
  return EXACT[name] ?? BY_ICON[categoryIconKey(cat)] ?? name;
}
