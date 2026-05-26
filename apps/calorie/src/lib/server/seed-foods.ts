/**
 * Hand-curated bundle of common everyday staples.
 *
 * Why a seed bundle: 5–10 friends-and-family users will hit the same handful of
 * foods over and over (Brötchen, Quark, Banane, Milch …). Shipping them locally
 * means most searches never touch OFF, which keeps us well clear of the 10 req/min
 * search rate limit and gives instant perceived performance even offline-ish.
 *
 * Nutrition values are rounded approximations from BLS / OFF aggregates; they're
 * good enough for tracking. The list is intentionally small — adding entries is
 * cheap. Once we get past ~150 we should swap to a CSV + validator.
 */

export type SeedFood = {
	id: string;
	names: { en: string; de: string; tr: string };
	kcal100g: number;
	protein100g: number;
	carbs100g: number;
	fat100g: number;
	fiber100g?: number;
	sugars100g?: number;
};

export const SEED_FOODS: ReadonlyArray<SeedFood> = [
	// Bread & baked
	{
		id: 'seed-broetchen',
		names: { en: 'Bread roll', de: 'Brötchen', tr: 'Sandviç ekmeği' },
		kcal100g: 280,
		protein100g: 9,
		carbs100g: 53,
		fat100g: 3,
		fiber100g: 2.5
	},
	{
		id: 'seed-vollkornbrot',
		names: { en: 'Wholegrain bread', de: 'Vollkornbrot', tr: 'Tam tahıllı ekmek' },
		kcal100g: 240,
		protein100g: 8.5,
		carbs100g: 41,
		fat100g: 3,
		fiber100g: 7
	},
	{
		id: 'seed-weissbrot',
		names: { en: 'White bread', de: 'Weißbrot', tr: 'Beyaz ekmek' },
		kcal100g: 265,
		protein100g: 8,
		carbs100g: 49,
		fat100g: 3,
		fiber100g: 2
	},

	// Dairy
	{
		id: 'seed-quark-mager',
		names: { en: 'Low-fat quark', de: 'Magerquark', tr: 'Yağsız lor' },
		kcal100g: 67,
		protein100g: 12,
		carbs100g: 4,
		fat100g: 0.3
	},
	{
		id: 'seed-quark-40',
		names: { en: 'Quark 40% fat', de: 'Quark 40% Fett', tr: 'Lor (yarım yağlı)' },
		kcal100g: 160,
		protein100g: 11,
		carbs100g: 3,
		fat100g: 11
	},
	{
		id: 'seed-joghurt-natur',
		names: { en: 'Plain yogurt', de: 'Joghurt natur', tr: 'Sade yoğurt' },
		kcal100g: 61,
		protein100g: 3.5,
		carbs100g: 4.7,
		fat100g: 3.3,
		sugars100g: 4.7
	},
	{
		id: 'seed-joghurt-griechisch',
		names: { en: 'Greek yogurt', de: 'Griechischer Joghurt', tr: 'Yunan yoğurdu' },
		kcal100g: 130,
		protein100g: 6,
		carbs100g: 4,
		fat100g: 10
	},
	{
		id: 'seed-milch-35',
		names: { en: 'Whole milk 3.5%', de: 'Vollmilch 3,5%', tr: 'Tam yağlı süt 3,5%' },
		kcal100g: 64,
		protein100g: 3.4,
		carbs100g: 4.8,
		fat100g: 3.5
	},
	{
		id: 'seed-milch-15',
		names: { en: 'Low-fat milk 1.5%', de: 'Fettarme Milch 1,5%', tr: 'Az yağlı süt 1,5%' },
		kcal100g: 47,
		protein100g: 3.4,
		carbs100g: 4.9,
		fat100g: 1.5
	},
	{
		id: 'seed-butter',
		names: { en: 'Butter', de: 'Butter', tr: 'Tereyağı' },
		kcal100g: 740,
		protein100g: 0.7,
		carbs100g: 0.6,
		fat100g: 82
	},
	{
		id: 'seed-gouda',
		names: { en: 'Gouda', de: 'Gouda', tr: 'Gouda peyniri' },
		kcal100g: 356,
		protein100g: 25,
		carbs100g: 0,
		fat100g: 28
	},
	{
		id: 'seed-camembert',
		names: { en: 'Camembert', de: 'Camembert', tr: 'Camembert peyniri' },
		kcal100g: 300,
		protein100g: 20,
		carbs100g: 0.5,
		fat100g: 24
	},
	{
		id: 'seed-frischkaese',
		names: { en: 'Cream cheese', de: 'Frischkäse', tr: 'Krem peynir' },
		kcal100g: 250,
		protein100g: 6,
		carbs100g: 4,
		fat100g: 24
	},

	// Eggs & meat & fish
	{
		id: 'seed-eier',
		names: { en: 'Eggs', de: 'Eier', tr: 'Yumurta' },
		kcal100g: 155,
		protein100g: 13,
		carbs100g: 1.1,
		fat100g: 11
	},
	{
		id: 'seed-haehnchenbrust',
		names: { en: 'Chicken breast', de: 'Hähnchenbrust', tr: 'Tavuk göğsü' },
		kcal100g: 165,
		protein100g: 31,
		carbs100g: 0,
		fat100g: 3.6
	},
	{
		id: 'seed-lachs',
		names: { en: 'Salmon', de: 'Lachs', tr: 'Somon' },
		kcal100g: 208,
		protein100g: 20,
		carbs100g: 0,
		fat100g: 13
	},
	{
		id: 'seed-hackfleisch-rind',
		names: { en: 'Beef mince', de: 'Rinderhackfleisch', tr: 'Dana kıyma' },
		kcal100g: 250,
		protein100g: 26,
		carbs100g: 0,
		fat100g: 17
	},
	{
		id: 'seed-leberwurst',
		names: { en: 'Liver sausage', de: 'Leberwurst', tr: 'Ciğer sosisi' },
		kcal100g: 326,
		protein100g: 14,
		carbs100g: 1.5,
		fat100g: 29
	},
	{
		id: 'seed-schinken-gekocht',
		names: { en: 'Cooked ham', de: 'Kochschinken', tr: 'Haşlama jambon' },
		kcal100g: 110,
		protein100g: 21,
		carbs100g: 0.5,
		fat100g: 3
	},
	{
		id: 'seed-salami',
		names: { en: 'Salami', de: 'Salami', tr: 'Salam' },
		kcal100g: 380,
		protein100g: 22,
		carbs100g: 1,
		fat100g: 32
	},

	// Carbs
	{
		id: 'seed-kartoffel',
		names: { en: 'Potato', de: 'Kartoffel', tr: 'Patates' },
		kcal100g: 77,
		protein100g: 2,
		carbs100g: 17,
		fat100g: 0.1,
		fiber100g: 2.2
	},
	{
		id: 'seed-reis-weiss',
		names: { en: 'White rice (cooked)', de: 'Reis weiß (gekocht)', tr: 'Beyaz pirinç (pişmiş)' },
		kcal100g: 130,
		protein100g: 2.7,
		carbs100g: 28,
		fat100g: 0.3
	},
	{
		id: 'seed-reis-vollkorn',
		names: { en: 'Brown rice (cooked)', de: 'Vollkornreis (gekocht)', tr: 'Esmer pirinç (pişmiş)' },
		kcal100g: 123,
		protein100g: 2.7,
		carbs100g: 26,
		fat100g: 1,
		fiber100g: 1.8
	},
	{
		id: 'seed-nudeln',
		names: { en: 'Pasta (cooked)', de: 'Nudeln (gekocht)', tr: 'Makarna (pişmiş)' },
		kcal100g: 158,
		protein100g: 5.8,
		carbs100g: 31,
		fat100g: 0.9,
		fiber100g: 1.8
	},
	{
		id: 'seed-haferflocken',
		names: { en: 'Oats', de: 'Haferflocken', tr: 'Yulaf ezmesi' },
		kcal100g: 379,
		protein100g: 13,
		carbs100g: 67,
		fat100g: 7,
		fiber100g: 10
	},
	{
		id: 'seed-muesli',
		names: { en: 'Muesli', de: 'Müsli', tr: 'Müsli' },
		kcal100g: 368,
		protein100g: 10,
		carbs100g: 65,
		fat100g: 6,
		fiber100g: 7
	},

	// Fruit
	{
		id: 'seed-banane',
		names: { en: 'Banana', de: 'Banane', tr: 'Muz' },
		kcal100g: 89,
		protein100g: 1.1,
		carbs100g: 23,
		fat100g: 0.3,
		fiber100g: 2.6,
		sugars100g: 12
	},
	{
		id: 'seed-apfel',
		names: { en: 'Apple', de: 'Apfel', tr: 'Elma' },
		kcal100g: 52,
		protein100g: 0.3,
		carbs100g: 14,
		fat100g: 0.2,
		fiber100g: 2.4,
		sugars100g: 10
	},
	{
		id: 'seed-birne',
		names: { en: 'Pear', de: 'Birne', tr: 'Armut' },
		kcal100g: 57,
		protein100g: 0.4,
		carbs100g: 15,
		fat100g: 0.1,
		fiber100g: 3.1,
		sugars100g: 10
	},
	{
		id: 'seed-erdbeeren',
		names: { en: 'Strawberries', de: 'Erdbeeren', tr: 'Çilek' },
		kcal100g: 32,
		protein100g: 0.7,
		carbs100g: 7.7,
		fat100g: 0.3,
		fiber100g: 2,
		sugars100g: 4.9
	},
	{
		id: 'seed-heidelbeeren',
		names: { en: 'Blueberries', de: 'Heidelbeeren', tr: 'Yaban mersini' },
		kcal100g: 57,
		protein100g: 0.7,
		carbs100g: 14,
		fat100g: 0.3,
		fiber100g: 2.4,
		sugars100g: 10
	},

	// Vegetables
	{
		id: 'seed-tomate',
		names: { en: 'Tomato', de: 'Tomate', tr: 'Domates' },
		kcal100g: 18,
		protein100g: 0.9,
		carbs100g: 3.9,
		fat100g: 0.2,
		fiber100g: 1.2
	},
	{
		id: 'seed-gurke',
		names: { en: 'Cucumber', de: 'Gurke', tr: 'Salatalık' },
		kcal100g: 16,
		protein100g: 0.7,
		carbs100g: 3.6,
		fat100g: 0.1,
		fiber100g: 0.5
	},
	{
		id: 'seed-karotte',
		names: { en: 'Carrot', de: 'Karotte', tr: 'Havuç' },
		kcal100g: 41,
		protein100g: 0.9,
		carbs100g: 9.6,
		fat100g: 0.2,
		fiber100g: 2.8
	},
	{
		id: 'seed-paprika',
		names: { en: 'Bell pepper', de: 'Paprika', tr: 'Biber' },
		kcal100g: 31,
		protein100g: 1,
		carbs100g: 6,
		fat100g: 0.3,
		fiber100g: 2.1
	},
	{
		id: 'seed-spinat',
		names: { en: 'Spinach', de: 'Spinat', tr: 'Ispanak' },
		kcal100g: 23,
		protein100g: 2.9,
		carbs100g: 3.6,
		fat100g: 0.4,
		fiber100g: 2.2
	},
	{
		id: 'seed-brokkoli',
		names: { en: 'Broccoli', de: 'Brokkoli', tr: 'Brokoli' },
		kcal100g: 34,
		protein100g: 2.8,
		carbs100g: 7,
		fat100g: 0.4,
		fiber100g: 2.6
	},
	{
		id: 'seed-zwiebel',
		names: { en: 'Onion', de: 'Zwiebel', tr: 'Soğan' },
		kcal100g: 40,
		protein100g: 1.1,
		carbs100g: 9.3,
		fat100g: 0.1,
		fiber100g: 1.7
	},
	{
		id: 'seed-avocado',
		names: { en: 'Avocado', de: 'Avocado', tr: 'Avokado' },
		kcal100g: 160,
		protein100g: 2,
		carbs100g: 9,
		fat100g: 15,
		fiber100g: 7
	},

	// Fats, nuts, legumes
	{
		id: 'seed-olivenoel',
		names: { en: 'Olive oil', de: 'Olivenöl', tr: 'Zeytinyağı' },
		kcal100g: 884,
		protein100g: 0,
		carbs100g: 0,
		fat100g: 100
	},
	{
		id: 'seed-mandeln',
		names: { en: 'Almonds', de: 'Mandeln', tr: 'Badem' },
		kcal100g: 579,
		protein100g: 21,
		carbs100g: 22,
		fat100g: 50,
		fiber100g: 12
	},
	{
		id: 'seed-walnuesse',
		names: { en: 'Walnuts', de: 'Walnüsse', tr: 'Ceviz' },
		kcal100g: 654,
		protein100g: 15,
		carbs100g: 14,
		fat100g: 65,
		fiber100g: 7
	},
	{
		id: 'seed-tofu',
		names: { en: 'Tofu', de: 'Tofu', tr: 'Tofu' },
		kcal100g: 76,
		protein100g: 8,
		carbs100g: 1.9,
		fat100g: 4.8
	},
	{
		id: 'seed-linsen',
		names: { en: 'Lentils (cooked)', de: 'Linsen (gekocht)', tr: 'Mercimek (pişmiş)' },
		kcal100g: 116,
		protein100g: 9,
		carbs100g: 20,
		fat100g: 0.4,
		fiber100g: 7.9
	},
	{
		id: 'seed-kichererbsen',
		names: { en: 'Chickpeas (cooked)', de: 'Kichererbsen (gekocht)', tr: 'Nohut (pişmiş)' },
		kcal100g: 164,
		protein100g: 8.9,
		carbs100g: 27,
		fat100g: 2.6,
		fiber100g: 7.6
	},

	// Sweets, spreads, drinks
	{
		id: 'seed-nutella',
		names: { en: 'Nutella', de: 'Nutella', tr: 'Nutella' },
		kcal100g: 539,
		protein100g: 6.3,
		carbs100g: 57,
		fat100g: 31,
		sugars100g: 56
	},
	{
		id: 'seed-honig',
		names: { en: 'Honey', de: 'Honig', tr: 'Bal' },
		kcal100g: 304,
		protein100g: 0.3,
		carbs100g: 82,
		fat100g: 0,
		sugars100g: 82
	},
	{
		id: 'seed-marmelade',
		names: { en: 'Jam', de: 'Marmelade', tr: 'Reçel' },
		kcal100g: 250,
		protein100g: 0.4,
		carbs100g: 60,
		fat100g: 0.1,
		sugars100g: 50
	},
	{
		id: 'seed-zucker',
		names: { en: 'Sugar', de: 'Zucker', tr: 'Şeker' },
		kcal100g: 387,
		protein100g: 0,
		carbs100g: 100,
		fat100g: 0,
		sugars100g: 100
	},
	{
		id: 'seed-kaffee-schwarz',
		names: { en: 'Coffee, black', de: 'Kaffee schwarz', tr: 'Sade kahve' },
		kcal100g: 1,
		protein100g: 0.1,
		carbs100g: 0,
		fat100g: 0
	},
	{
		id: 'seed-tee-schwarz',
		names: { en: 'Black tea', de: 'Schwarzer Tee', tr: 'Siyah çay' },
		kcal100g: 1,
		protein100g: 0,
		carbs100g: 0.3,
		fat100g: 0
	},
	{
		id: 'seed-wasser',
		names: { en: 'Water', de: 'Wasser', tr: 'Su' },
		kcal100g: 0,
		protein100g: 0,
		carbs100g: 0,
		fat100g: 0
	},
	{
		id: 'seed-bier-pils',
		names: { en: 'Pilsner beer', de: 'Pils', tr: 'Pilsner bira' },
		kcal100g: 43,
		protein100g: 0.5,
		carbs100g: 3.6,
		fat100g: 0
	},
	{
		id: 'seed-rotwein',
		names: { en: 'Red wine', de: 'Rotwein', tr: 'Kırmızı şarap' },
		kcal100g: 85,
		protein100g: 0.1,
		carbs100g: 2.6,
		fat100g: 0
	},
	{
		id: 'seed-weisswein',
		names: { en: 'White wine', de: 'Weißwein', tr: 'Beyaz şarap' },
		kcal100g: 82,
		protein100g: 0.1,
		carbs100g: 2.6,
		fat100g: 0
	}
];
