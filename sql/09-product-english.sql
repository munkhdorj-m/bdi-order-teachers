-- BDI Дэлгүүр: English product names and descriptions (МН / EN switch).
--   name_en         the name English-language teachers see        (empty = the Mongolian name)
--   description_en  the product page text in English             (empty = the Mongolian text)
-- Admin → Бараа → ✎ can change them later. Running this again never
-- overwrites English text the admin already changed.
-- Run in the Supabase SQL editor (after 04). Safe to run again.

begin;

alter table public.teacher_products
  add column if not exists name_en text check (name_en is null or char_length(btrim(name_en)) between 1 and 200),
  add column if not exists description_en text check (description_en is null or char_length(description_en) <= 4000);

insert into public.teacher_products (product_id, name_en, description_en)
select v.id, v.name_en, v.description_en
from (values
  ('bd333e17-2c0e-48ee-93a8-a836d337778d'::uuid, $t$Ecoclean Floral Eco Laundry Sheets, 100 washes$t$, $t$Gently floral-scented laundry sheets made from quality natural ingredients. Free of phosphates, bleach and harsh chemicals, so they don't cause allergies. They foam well and wash to a high standard. Nano structure. Packed in a paper box and bag, so they are eco-friendly.
Washes all kinds of clothes in any machine. Use 1-2 sheets per load, depending on the amount of laundry.

Box 165x138x55mm
Sheet 110x140
48 pcs
45.5x43.5x36cm$t$),
  ('fd3f0d2f-ef6a-4375-81e0-cb2d9876923c'::uuid, $t$Ecoclean Floral Eco Laundry Sheets, 6 washes$t$, $t$Box 165x138x55mm
Sheet 110x140
200 pcs
28.5x28x21cm$t$),
  ('d197487f-7ed7-4c8d-b9c3-f217f3ff0b12'::uuid, $t$OralGos Kids Toothbrush, ages 1-6, boxed$t$, $t$Extra soft, shaped for children's sensitive teeth, with a toy-shaped handle and a hanging loop, in a quality box.

0.12mm bristles
13x6x2.7, packed 20 per case$t$),
  ('cf42fa14-63bc-4b40-a977-7c405505b837'::uuid, $t$Oralgos Royal Shine Soft Toothbrush, boxed$t$, null),
  ('db8520ec-e8c6-4951-927d-66884170d2a8'::uuid, $t$Oralgos Ultra 0.12mm Fine-Bristle Toothbrush, 2-pack$t$, $t$Fine 0.12mm bristles clean deep between the teeth. The bristles are coated with silver, which kills bacteria and stops them from growing. Comes in gold and silver; each brush is wrapped in eco paper and packed in a paper box, 24.5x6x1.5 cm.

2 pcs$t$),
  ('508801ed-448b-4763-ad99-7e148f1293a7'::uuid, $t$Pimple Acne Patches, 36 pcs$t$, null),
  ('bdb45396-40e8-4b61-a9b6-4edb69c30f6d'::uuid, $t$Silky Cotton Facial Cotton Pads, 100 pcs$t$, $t$58mm 50g 100 pcs
Length 26 cm

100 pcs$t$),
  ('aed38ff9-7882-46f4-b3c2-e65520d7951f'::uuid, $t$Silky Cotton Facial Cotton Pads, 50 pcs$t$, $t$58mm 50g 50 pcs
Length 16 cm

50 pcs$t$),
  ('8c1c6347-e161-4909-ba66-8c1a952f8721'::uuid, $t$Soft Leaf TOP$t$, null),
  ('15efbb72-09e0-437b-914b-806af17d7066'::uuid, $t$Soft Leaf Moist Toilet Paper, 5-ply, 10 pcs$t$, null),
  ('f1aaeeb8-0d23-4133-91ed-007737f9d2dd'::uuid, $t$Sweet Trip Silicone Double Tongue Scraper, 2 shapes, Japan$t$, $t$Made of quality silicone in two shapes, it scrapes away the germs and coating that cause bad breath. Soft, so it won't hurt the tongue.

1 pc$t$),
  ('ead8c048-2d2b-4bdf-b191-b02aced6bb61'::uuid, $t$Yusen Dry Tissues, 3-ply$t$, $t$300 sheets per bag, 96 per bundle

96 pcs$t$),
  ('27b6e90b-1520-4f84-9213-b09ed3b8fed1'::uuid, $t$Orthodontic Toothbrush, boxed$t$, $t$0.15mm bristles
19.5x2.8x2.5, packed 20 per case$t$),
  ('f99b265c-b654-4269-83c7-697999566603'::uuid, $t$Hygiene Product, 18 cm$t$, null),
  ('55b4adb2-e803-40d1-b622-c07f7d240b4f'::uuid, $t$Hygiene Product, 24 cm$t$, null),
  ('07211a09-e0b6-4acf-bfa5-0a0d38f2078a'::uuid, $t$Toilet Paper 750g, 3 rolls$t$, $t$96x138mm, 16GSM, 3-ply, 750g for 3 rolls, embossed edges

Packed 3 rolls to a bag with a handle$t$),
  ('dfe2fddb-f1f1-4579-8d22-c163534b6f94'::uuid, $t$Toilet Paper, 1 roll$t$, $t$ECO FRIENDLY 100% virgin wood pulp, pressed into a FLUSHABLE structure that fully breaks down in water, so it won't clog pipes. Flower embossing, Ultra Soft, easy to tear, 4-ply.

Weight 180g, 187 sheets
104x138mm, 16GSM$t$),
  ('aef89750-ced3-47c6-bf4a-05a4dfbe7be0'::uuid, $t$Toilet Paper, 4 rolls$t$, $t$ECO FRIENDLY 100% virgin wood pulp, pressed into a FLUSHABLE structure that fully breaks down in water, so it won't clog pipes. Flower embossing, Ultra Soft, easy to tear, 4-ply.

104x138mm, 16GSM, 4-ply, 205 sheets
Weight 720g, 4 rolls in a bag with a handle, 187 sheets$t$),
  ('0eaf393b-14fc-4708-9aed-6f46e8b02a93'::uuid, $t$Toilet Paper, 8 rolls$t$, $t$ECO FRIENDLY 100% virgin wood pulp, pressed into a FLUSHABLE structure that fully breaks down in water, so it won't clog pipes. Flower embossing, Ultra Soft, easy to tear, 4-ply.

Packed 8 rolls to a bag with a handle$t$),
  ('40938b6b-c45b-4060-9516-e8911750a052'::uuid, $t$Antibacterial Wet Wipes, 10 pcs, individually wrapped$t$, $t$Kills 99.9% of germs and bacteria (Sterilization MILD, without irritants) and is gentle on skin. Thick fabric wipes, unscented and hypoallergenic.
Each wipe is wrapped on its own, so it doesn't dry out when you carry it, and it's pleasant to use.

200x150mm, 50GSM, 10 individually wrapped wipes
10 per bag, 12 bags per box$t$),
  ('4b429bf0-8155-43cb-9ace-9c116075abfb'::uuid, $t$Antibacterial Wet Wipes, 25 pcs, with lid$t$, $t$Kills 99.9% of germs and bacteria (Sterilization MILD, without irritants) and is gentle on skin. Thick fabric wipes, unscented and hypoallergenic.
The lid and well-sealed film pack keep them from drying out when you carry them, and they're pleasant to use.

200x150mm, 50GSM, 25 wipes with lid
4 per bag, 15 bags per box$t$),
  ('9c0f2014-f1a1-40f5-9a1e-2eb007819c53'::uuid, $t$Bathroom Mat Set, 3 pieces$t$, null),
  ('3587d572-58c1-481d-ae82-4c423fd6bda0'::uuid, $t$Bathroom Set, 4 pieces$t$, null),
  ('9df641fa-89f0-4576-b708-8d6e8213e639'::uuid, $t$Dish Sponges, 5 pcs, assorted colors$t$, $t$Thick two-layer sponge with a Trylene scrubber
Two sides: plain and scrubbing. Dense and durable.
In a shiny bag for hanging

10x7x3cm
5 pcs$t$),
  ('5c0484f0-bd81-4094-bd09-c68e4fcb58e1'::uuid, $t$Dish Scrub Sponges, 3 pcs$t$, $t$Three-layer sponge with a Trylene scrubber
Two sides: wavy and scrubbing. Dense and durable.

11x7x3.5cm
3 pcs$t$),
  ('045b9001-61c2-4535-aafb-012511e34722'::uuid, $t$Dish Scrub Sponge, 1 pc, yellow$t$, $t$Thick two-layer sponge with a Trylene scrubber

10x7x3cm, 1 pc$t$),
  ('2e9432e2-94aa-4302-beee-ddc9c224698e'::uuid, $t$Natural Whitening Toothpaste, 120g$t$, $t$Features: This fluoride-free hydroxyapatite toothpaste with natural ingredients is made for adults with sensitive teeth. It whitens and strengthens enamel. Mint-flavored, with plant-based ingredients for oral care, healthy gums and less sensitivity. RoHS and CE certified, meeting EU safety standards.

120ml$t$),
  ('2c2cb2c2-df1c-4f08-811c-7b9b2464bdcc'::uuid, $t$Men's Belt with Bar Buckle$t$, null),
  ('8164448f-bf73-4589-9795-b49cf0b0e6a2'::uuid, $t$Acne Patches$t$, $t$12mm: 24 patches, 8mm: 12 patches, 36 in total

50 pcs$t$),
  ('14344880-d1b3-4c76-ad4d-fbe63d0ab6b4'::uuid, $t$Metabolism-Boosting Slimming Patches, 30 pcs$t$, null),
  ('b37a8e65-2713-46ea-a654-477d0c4a9721'::uuid, $t$3D Fabric Shower Curtain$t$, null),
  ('b874e19e-de34-40d7-a565-6bb731e42ebb'::uuid, $t$Vinyl Shower Curtain$t$, null),
  ('44ffceab-80f2-491e-8f76-ba7380e854da'::uuid, $t$Kitchen Wet Wipes, 20 pcs, antibacterial with lemon$t$, $t$Proven by a third-party institute to kill 99.9% of Escherichia coli and Staphylococcus aureus. Removes grease, stains and germs from kitchen counters, stoves, range hoods and sinks.
Thick embossed fabric you can wash and reuse, wet or dry, with double lemon to lift grease and set-in stains.

EXTRA LARGE 200x270mm, thick embossed fabric, 90GSM, 20 per bag$t$),
  ('604220c0-7f0c-4334-af35-b00885225c1c'::uuid, $t$Reusable Kitchen Towels, 50 pcs, 28x28 cm$t$, $t$Large, thick 60g paper towels with a honeycomb pattern. Can be washed and reused 2-3 times.

EXTRA LARGE 280x280mm, thick embossed fabric, 60GSM, roll of 50$t$),
  ('6ce29ac8-1d72-42b0-bd80-e81adda2a76f'::uuid, $t$Super-Absorbent Kitchen Towels, 3 pcs, 38x40$t$, $t$German-style super-absorbent towels in 3 colors, thick and quilted

38x40, 3 pcs$t$),
  ('39402bcb-4b39-49ec-bb87-fb56e66e0b60'::uuid, $t$Kitchen Mat Set, 2 pieces$t$, null),
  ('6e043a49-a6af-438b-9c4a-28e891a1aa25'::uuid, $t$Kitchen Paper Towels, 80 sheets$t$, $t$100% virgin wood pulp, sterilized at 450°C before packing, so it is germ-free, bleach-free and chemical-free: clean, safe and hygienic.
UNIQUE double embossing lock, so it soaks up oil and water well.

210x235mm, 40GSM, 2-ply, 750g, 80 sheets per bag
Embossed pattern
Packed 3 to a bag$t$),
  ('bff91098-a04a-41ca-b285-d1a6ace2101c'::uuid, $t$Steel Wire Scrubbing Cloths, 3 pcs, 20x20 cm$t$, $t$Rough steel-wire scrubbing cloth that cleans pots and dishes without scratching.

20x20cm, 3 pcs$t$),
  ('12297da9-f34f-4395-99a3-944b5826639b'::uuid, $t$Women's Gold Metal Dress Belt$t$, null),
  ('406751b6-5db4-47fe-ad8d-99f681de484b'::uuid, $t$Women's Embellished Dress Belt$t$, null),
  ('8685c194-fa33-47be-8fbf-296124ab822b'::uuid, $t$3D English-Style Toothbrush, 2-pack$t$, $t$Flexible 3D head with a tongue scraper, soft premium bristles and a clear crystal handle, packed in pairs.

0.15mm bristles
24x8.5x2cm, packed 2 per case$t$),
  ('1c53e6d4-9ad6-4327-b89a-1f8723fe3478'::uuid, $t$3D English-Style Toothbrush, boxed$t$, $t$Soft premium bristles set in a 3D silicone base, a wide handle in gold or silver, and a plastic hanging case.

0.15mm bristles, 23x3.5x3cm
Packed 16 per case$t$),
  ('18324fbb-59e0-42b5-88b7-a89e6c55dac0'::uuid, $t$Deep Stain & Rust Scrubbers, 5 pcs$t$, $t$Thick, flat, rough scrubbers in 5 colors that clean pots and dishes without scratching.

15x10cm, 5 pcs$t$),
  ('a0f28eba-5ba0-40bb-8e32-6366a525b712'::uuid, $t$Women's Thin Dress Belt with Round Buckle$t$, null),
  ('a45d87ad-330b-4d86-92de-7f7df079c8f5'::uuid, $t$Aloe Vera Wet Wipes, 10 pcs$t$, $t$Thick fabric wipes with aloe vera that clean hands and moisturize skin.

10 per pack, 18 packs per outer bag$t$),
  ('fe3860fb-d2c6-4be2-9e9b-ea0a9593da58'::uuid, $t$Aloe Vera Wet Wipes, 60 pcs$t$, $t$Kills 99.9% of germs and bacteria (Sterilization MILD, without irritants), with aloe vera extract that moisturizes and protects skin from drying out. Soft, unscented, hypoallergenic thick fabric wipes.
Economical family pack with a lid, good for home hygiene. Doesn't dry out and is pleasant to use.

200x150mm, 50GSM, 60 wipes$t$),
  ('a04bbdd6-a620-415e-9e6d-1d02a6951a15'::uuid, $t$Fine-Bristle Toothbrush, 1 pc, boxed$t$, $t$Soft 0.15mm PBT bristles care for gums very gently and clean the mouth well. The crystal handle, made of PP+PETG in 5 colors, is stylish and comfortable to hold. Packed in a sturdy plastic travel case with a hanger. Certified CE, RoHS, EMC, MSDS and TDS, meeting EU safety standards.

1 pc$t$),
  ('9ec46e26-91c3-4c81-be05-d40ae7bcd07c'::uuid, $t$Thin Gloves$t$, null),
  ('9b09b1f0-cf65-4f6a-9031-33e3334a36f3'::uuid, $t$Sleep Aid Patches, 10 pcs$t$, $t$Size 6x5cm, 1mm thick

10 pcs$t$),
  ('8738cc3d-b275-4277-a580-572b7f45c4d2'::uuid, $t$Wettable Paper Tissues, 130 pcs, bag$t$, $t$WETTABLE: soft 100% wood-pulp tissues you can use dry or wet with facial cleanser.
3-ply and soft, packed in a bag. Light and handy for travel.

100% virgin wood pulp, 180x128mm, 13GSM, 3-ply, 130 pcs$t$),
  ('514dcaa9-53a4-4dbc-844f-7da74dee5e23'::uuid, $t$Wettable Paper Tissues, 200 pcs, box$t$, $t$WETTABLE: soft, natural 100% wood-pulp tissues you can use dry or wet with facial cleanser.
2-ply and soft, 200 tissues in an economical box.

100% virgin wood pulp, 190x180mm, 13GSM, 2-ply, 200 pcs, 48 boxes per case$t$),
  ('4335afe8-4355-4b91-9c35-842eeb227f1c'::uuid, $t$Herbal Back Pain Relief Patches, 12 pcs$t$, $t$Size 13.8x9.5cm

12$t$),
  ('507cc68b-f5e9-4545-9483-5bdfc2f1c386'::uuid, $t$Women's Floral Belt with Holes$t$, null),
  ('72e58f88-4fca-426e-816e-6c3627021b1d'::uuid, $t$Herbal Knee Pain Relief Patches, 12 pcs$t$, $t$Size 13.8x9.5cm

12$t$),
  ('a17f3d68-244c-46da-af9e-1da8836d9608'::uuid, $t$Mesh Scrubber and Cloth Washer$t$, $t$Durable thick mesh scrubber and cotton cloth

12x7x1.8 cm, 1 pc$t$),
  ('690bfe52-17f1-4a58-8a1f-5917ef1f7c96'::uuid, $t$Rose Detox Foot Patches, 10 pcs$t$, $t$6x8cm

10 pcs$t$),
  ('ab863772-2f11-4af1-951b-16cf61ae8ed1'::uuid, $t$Metal Pot Scrubbers, 2 pcs$t$, $t$Double Emery scrubbing surface that removes rust stains
Dense, sturdy core

10x7x2.5
2 pcs$t$),
  ('093799f6-a7b6-4065-bfd6-eb63e4c242ba'::uuid, $t$Men's Black Belt with Lock Buckle$t$, null),
  ('b32b07a6-3193-46bd-a8ed-8f270e912979'::uuid, $t$Prostate Patches, 7 pcs$t$, $t$Contains medicinal herbs that ease prostate discomfort. Vacuum-packed.
Size 6x5cm, 1mm thick

7 pcs$t$),
  ('b1b913e3-ca53-483d-972c-d2929f3379d6'::uuid, $t$Women's Thin Belt with Long Buckle$t$, null),
  ('2c080dc8-53aa-4a4e-ab3d-97041674e085'::uuid, $t$High-Protein Green Bean Gluten-Free Pasta, 200g$t$, $t$200g, box 25x14x8cm

10 pcs$t$),
  ('399fd05b-e3cc-46ca-aa5b-470450fb5ef7'::uuid, $t$High-Protein Soybean Gluten-Free Pasta, 200g$t$, $t$200g, box 25x14x8cm

10 pcs$t$),
  ('be0b3621-b769-40ab-95d2-1bfa9093a294'::uuid, $t$Herbal Cooling Joint Oil$t$, null),
  ('f6de2a0f-e4e7-46c1-95f0-00aaf0fc3904'::uuid, $t$Herbal Warming Joint Oil$t$, null),
  ('50df77c6-dfe2-4074-a966-dc2edc8e105d'::uuid, $t$Pocket Wettable Tissues, 4-ply, 10 pcs$t$, $t$100% quality wood pulp, 4-ply. Use dry or wet with cleansing lotion.
Pure wood pulp, sterilized and pressed into an Ultra Strong structure, ISO quality certified.

10 per pack, 12 packs per outer bag$t$),
  ('9cf5cefa-beda-486b-93b8-cc8b63ac4d38'::uuid, $t$Fever Cooling Patches, 4 pcs$t$, $t$9x10cm

4 pcs$t$),
  ('2cbaa44b-002c-456f-826a-aa81a35900ab'::uuid, $t$Anti-Cough Patches, 6 pcs$t$, $t$3x5cm

6 pcs$t$),
  ('164ff24b-7288-491a-a301-b6f3e97fc74c'::uuid, $t$Bamboo Toilet Paper 1150g, 5-ply, 10 rolls$t$, $t$Very soft, dense paper with natural antibacterial properties that doesn't tear or crumble

128x138, 10 rolls$t$),
  ('786b6b1f-ebaa-4742-8aeb-17e00afd4887'::uuid, $t$Bamboo Toilet Paper 700g, 5-ply, 12 rolls$t$, $t$128x138, 12 rolls

Packed 12 rolls to a bag with a handle$t$),
  ('3f47acaa-ce9b-4c7f-b491-5272fafbff68'::uuid, $t$Bamboo Vinegar Detox Patches, 10 pcs$t$, $t$6x8cm

10 pcs$t$),
  ('7480c51e-6abe-4794-b5fc-6870a28453da'::uuid, $t$Neck Osteochondrosis Patches, 12 pcs$t$, null),
  ('814de428-4321-4bc5-8b8f-792e797bcdbc'::uuid, $t$Herbal Neck Pain Relief Patches, 12 pcs$t$, $t$Size 10x13cm

12$t$),
  ('12f07d65-d798-46de-a0df-efda0c7e71b6'::uuid, $t$Women's Patterned Buckle Belt$t$, null),
  ('6102531d-9703-4028-83da-5ea57b7d12a9'::uuid, $t$Ginger Detox Foot Patches, 10 pcs$t$, $t$6x8cm

10 pcs$t$),
  ('32ad7e61-f16b-4d3c-8813-387644af6dfe'::uuid, $t$100% Natural Cotton Ear Swabs, 55 pcs$t$, $t$7.5x8.5cm

55 pcs$t$),
  ('c51600ed-b26d-4fcd-9b9b-20774ad561d7'::uuid, $t$Women's Wide Leather Belt with Double Buckle$t$, null),
  ('0dd5a1b4-67f5-4ae0-83b7-49822ed4d7a9'::uuid, $t$Dental Floss Picks with Handle, 50 pcs$t$, $t$Features: Made of food-grade HIPS and 1500D PTFE 400D ultra-high molecular weight material, these floss picks clean between teeth safely and effectively. Disposable, in a box for home or travel. CE and RoHS certified.

50 pcs$t$),
  ('ed02d9a7-c751-404c-bf5e-62020c6a4f5e'::uuid, $t$Corn and Callus Removal Patches$t$, $t$Size 6.5x2.0cm, 2mm thick

6 pcs$t$),
  ('5530e925-d1b0-46c2-90f6-f4d8124f1dc2'::uuid, $t$Sensitive Teeth Whitening & Repair Toothpaste, 120g$t$, $t$This fluoride-free toothpaste has natural, plant-based ingredients and a fresh mint flavor. It eases sensitivity and whitens. The organic formula removes stains, strengthens teeth and freshens breath. CE and RoHS certified.

120ml$t$),
  ('a6aa969f-3784-41a8-9085-d472bd9e70bb'::uuid, $t$Men's Belt with Swivel Buckle$t$, null)
) as v(id, name_en, description_en)
join public.products p on p.id = v.id
on conflict (product_id) do update
  set name_en        = coalesce(public.teacher_products.name_en, excluded.name_en),
      description_en = coalesce(public.teacher_products.description_en, excluded.description_en),
      updated_at     = now();

commit;
