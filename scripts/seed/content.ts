/*
 * Content migrated from https://mbatravelsgoa.com/ (snapshot 2026-10-29, docs/source-snapshot/).
 * Text is copied verbatim, including original spelling/punctuation; corrections need approval
 * (docs/open-questions.md Q21). Each record carries its source URL for the migration report.
 */

const SITE = "https://mbatravelsgoa.com";
export const SRC = {
  home: `${SITE}/`,
  about: `${SITE}/about-us/`,
  packages: `${SITE}/packages/`,
  taxi: `${SITE}/taxi-services/`,
  hotels: `${SITE}/hotels/`,
  gallery: `${SITE}/gallery/`,
  contact: `${SITE}/goa-taxi-service-contact/`,
};

/* ------------------------------------------------------------------ images */

export type ImageSource = {
  key: string;
  /** Local file in docs/source-snapshot/uploads or a remote URL. */
  file?: string;
  /** Owner-supplied file in scripts/seed/assets/ */
  asset?: string;
  url?: string;
  alt: string;
  licence: "owner" | "licensed" | "pending";
  credit: string;
  sourceUrl: string;
  note?: string;
};

const unsplash = (id: string, w: number, alt: string, key: string): ImageSource => ({
  key,
  url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`,
  alt,
  licence: "licensed",
  credit: "Photo via Unsplash (Unsplash License)",
  sourceUrl: `https://images.unsplash.com/photo-${id}`,
  note: "Used on the original site; Unsplash License permits reuse.",
});

const commons = (key: string, url: string, alt: string, credit: string, page: string): ImageSource => ({
  key,
  url,
  alt,
  licence: "licensed",
  credit,
  sourceUrl: page,
  note: "Replacement for an unlicensed hotlinked image on the original site — requires owner approval (open-questions Q12).",
});

const heroCard = (n: number, alt: string): ImageSource => ({
  key: `hero-card-${n}`, asset: `hero-cards/card-${n}.png`, alt, licence: "owner", credit: "", sourceUrl: "Supplied by the business owner",
  note: "Supplied by the owner for the homepage hero cards. Looks AI-generated: do not present as photos of the real fleet unless confirmed.",
});

export const IMAGES: ImageSource[] = [
  heroCard(1, "Three white MBA Taxi vehicles, a sedan, an SUV and a van, parked beside a Goa beach"),
  heroCard(2, "White MBA Taxi people carrier on a coastal road in Goa with a fort and lighthouse behind"),
  heroCard(3, "White MBA Taxi sedan on a palm-lined coastal road in Goa"),
  heroCard(4, "Sunset over a Goa beach with palm trees and beach shacks"),
  { key: "logo", file: "file_00000000e96081fab985888c376ae30d.png", alt: "MBA Travels Goa", licence: "owner", credit: "", sourceUrl: `${SITE}/wp-content/uploads/2026/07/file_00000000e96081fab985888c376ae30d.png` },
  { key: "contact-og", file: "WhatsApp-Image-2026-10-12-at-00.42.27.jpeg", alt: "goa taxi service", licence: "pending", credit: "", sourceUrl: `${SITE}/wp-content/uploads/2026/10/WhatsApp-Image-2026-10-12-at-00.42.27.jpeg`, note: "Appears AI-generated; confirm before presenting as a company vehicle (Q13)." },

  unsplash("1518509562904-e7ef99cdcc86", 2000, "Goa taxi service near Palolem Beach", "hero-1"),
  unsplash("1507525428034-b723cf961d3e", 2000, "Goa Beach Sunset", "hero-2"),
  unsplash("1500530855697-b586d89ba3ee", 2000, "Tropical Palm Road", "hero-3"),
  unsplash("1506744038136-46273834b3fb", 2000, "Mountain Waterfall", "hero-4"),
  unsplash("1501785888041-af3ef285b470", 2000, "Nature Landscape", "hero-5"),
  unsplash("1512343879784-a960bf40e7f2", 1400, "North Goa Tour", "pkg-north"),
  unsplash("1488646953014-85cb44e25828", 1400, "Custom Tour", "pkg-custom"),
  unsplash("1519046904884-53103b34b206", 1400, "Goa Dinner Cruise", "pkg-dinner"),
  unsplash("1506929562872-bb421503ef21", 1400, "Airport + Tour", "pkg-airport"),
  unsplash("1436491865332-7a61a109cc05", 1600, "Airport Transfer", "airport"),
  unsplash("1527631746610-bca00a040d60", 1200, "MBA Travels", "about-1"),

  commons("pkg-dudhsagar", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Dudhsagar_falls_%284266264965%29.jpg/1920px-Dudhsagar_falls_%284266264965%29.jpg", "Dudhsagar Falls, Goa", "Photo: soumyajit pramanick, CC BY-SA 2.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Dudhsagar_falls_(4266264965).jpg"),
  commons("vehicle-dzire", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Maruti_Suzuki_Dzire_VXi_VVT.JPG/1920px-Maruti_Suzuki_Dzire_VXi_VVT.JPG", "Maruti Suzuki Dzire (representative image)", "Photo: Biswarup Ganguly, CC BY 3.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Maruti_Suzuki_Dzire_VXi_VVT.JPG"),
  commons("vehicle-ertiga", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Maruti_Suzuki_Ertiga%281%29.jpg/1920px-Maruti_Suzuki_Ertiga%281%29.jpg", "Maruti Suzuki Ertiga (representative image)", "Photo: Akashpbrahmavar, CC0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Maruti_Suzuki_Ertiga(1).jpg"),
  commons("vehicle-innova", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Toyota_Innova_GCC_front.jpg/1920px-Toyota_Innova_GCC_front.jpg", "Toyota Innova (representative image)", "Photo: Mohammed Hamad, CC BY-SA 4.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Toyota_Innova_GCC_front.jpg"),
  commons("vehicle-crysta", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Toyota_Innova_Crysta_2.4_Z_front_right.jpg/1920px-Toyota_Innova_Crysta_2.4_Z_front_right.jpg", "Toyota Innova Crysta (representative image)", "Photo: Premnath Kudva, CC BY-SA 4.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Toyota_Innova_Crysta_2.4_Z_front_right.jpg"),
  commons("exp-beaches", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Baga_Beach%2C_Calangute%2C_Goa.jpg/1920px-Baga_Beach%2C_Calangute%2C_Goa.jpg", "Baga Beach, Calangute, Goa", "Photo: उर्मिला गावस, CC BY-SA 4.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Baga_Beach,_Calangute,_Goa.jpg"),
  commons("exp-adventure", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Flying_goa_sea.JPG/1920px-Flying_goa_sea.JPG", "Parasailing over the sea in Goa", "Photo: rajeshodayanchal, CC BY 3.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Flying_goa_sea.JPG"),
  commons("pkg-cruise", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Panaji%2C_Goa%2C_India%2C_Sunset%2C_Mandovi_River.jpg/1920px-Panaji%2C_Goa%2C_India%2C_Sunset%2C_Mandovi_River.jpg", "Sunset over the Mandovi River, Panaji", "Photo: Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Panaji,_Goa,_India,_Sunset,_Mandovi_River.jpg"),
  commons("exp-heritage", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Basilica_of_Bom_Jesus%2C_Goa_2.jpg/1920px-Basilica_of_Bom_Jesus%2C_Goa_2.jpg", "Basilica of Bom Jesus, Old Goa", "Photo: Slyronit, CC BY-SA 4.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Basilica_of_Bom_Jesus,_Goa_2.jpg"),
  commons("exp-nightlife", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Our_Lady_of_the_Immaculate_Conception_Church%2C_Panaji_at_night.jpg/1920px-Our_Lady_of_the_Immaculate_Conception_Church%2C_Panaji_at_night.jpg", "Panaji at night", "Photo: ArBay11, CC BY 4.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Our_Lady_of_the_Immaculate_Conception_Church,_Panaji_at_night.jpg"),
  commons("exp-nature", "https://upload.wikimedia.org/wikipedia/commons/7/7e/Spice_plantation%2C_Goa.jpg", "Spice plantation, Goa", "Photo: Haydn Blackey, CC BY-SA 2.0, via Wikimedia Commons", "https://commons.wikimedia.org/wiki/File:Spice_plantation,_Goa.jpg"),
];

/** Hotel photos uploaded by the business to WordPress (rights to be confirmed, Q13). Order matches the live slider. */
export const HOTEL_IMAGES: Record<string, string[]> = {
  "Royal Nirvana Resort": ["21-16-53-035_com.openai.chatgpt.jpg-e1785837604568", "21-17-14-699_com.openai.chatgpt.jpg-e1785837636812", "21-17-19-423_com.openai.chatgpt.jpg-e1785837527752", "21-16-58-969_com.openai.chatgpt.jpg-e1785837665569", "21-17-26-058_com.openai.chatgpt.jpg-e1785837582427"],
  "WS Beach Resort": ["21-27-15-115_com.openai.chatgpt.jpg-e1785837929690", "21-27-19-248_com.openai.chatgpt.jpg-e1785837976642", "21-27-32-060_com.openai.chatgpt.jpg-e1785838015169"],
  "Palmarinha Resort": ["21-42-06-645_com.openai.chatgpt.jpg-e1785838168981", "21-41-49-526_com.openai.chatgpt.jpg-e1785838194368", "21-42-01-700_com.openai.chatgpt.jpg-e1785838221644", "21-41-55-653_com.openai.chatgpt.jpg-e1785838146401"],
  "The Flora Residency": ["21-47-10-095_com.openai.chatgpt.jpg-e1785838411236", "21-53-31-056_com.openai.chatgpt.jpg-e1785838350582", "21-53-36-041_com.openai.chatgpt.jpg-e1785838369869", "21-47-16-379_com.openai.chatgpt.jpg-e1785838388831"],
  "Neelam The Glitz": ["22-07-30-668_com.openai.chatgpt.jpg-e1785838561446", "22-08-34-579_com.openai.chatgpt.jpg-e1785838581201", "22-07-41-682_com.openai.chatgpt.jpg-e1785838603143", "22-07-25-459_com.openai.chatgpt.jpg-e1785838686689"],
  "Sinq Beach Resort": ["22-12-06-226_com.openai.chatgpt.jpg-e1785838879203", "22-12-33-956_com.openai.chatgpt.jpg-e1785838854462", "22-11-18-973_com.openai.chatgpt.jpg-e1785838830598"],
  "Somy Plaza": ["22-14-31-574_com.openai.chatgpt.jpg-e1785839006386", "22-14-27-665_com.openai.chatgpt.jpg-e1785839149819", "22-14-23-099_com.openai.chatgpt.jpg-e1785839172609"],
};
export const hotelFile = (part: string) => `Screenshot_2026-08-03-${part}.jpeg`;

/* ------------------------------------------------------------------ catalogue */

export const SERVICES = [
  { title: "Flight Booking", icon: "plane-takeoff", category: "", summary: "Domestic & International flight reservations at competitive prices.", features: ["Instant Confirmation", "Best Airfare Deals", "24×7 Assistance"] },
  { title: "Train Booking", icon: "train-front", category: "", summary: "Reserve railway tickets with quick confirmation and support.", features: ["All Routes", "Fast Booking", "Customer Support"] },
  { title: "Bus Booking", icon: "bus", category: "", summary: "AC, Sleeper and Luxury bus bookings across India.", features: ["Luxury Coaches", "Instant Tickets", "Safe Travel"] },
  { title: "Goa Taxi Service", icon: "car-taxi-front", category: "featured", summary: "Airport transfers, sightseeing and local taxi rentals.", features: ["Professional Drivers", "Clean Vehicles", "On-Time Pickup"] },
  { title: "Hotel Booking", icon: "hotel", category: "", summary: "Luxury resorts, villas and budget hotels across Goa.", features: ["Premium Hotels", "Beach Resorts", "Best Rates"] },
  { title: "Holiday Packages", icon: "umbrella", category: "featured", summary: "Complete Goa holiday packages for families and couples.", features: ["Custom Itinerary", "Sightseeing", "Hotel Included"] },
  { title: "Cruise Booking", icon: "ship", category: "", summary: "Sunset cruises, dinner cruises and party cruise experiences.", features: ["Sunset Cruise", "Dinner Cruise", "Party Cruise"] },
  { title: "Corporate Travel", icon: "briefcase", category: "", summary: "Business travel management for companies and organizations.", features: ["Corporate Rates", "Dedicated Support", "GST Billing"] },
];

/** Package records hold the /packages/ page values; homepage-specific wording is kept as section overrides. */
export const PACKAGES = [
  { key: "north", name: "North Goa Tour", summary: "Baga Beach • Calangute • Fort Aguada • Candolim • Anjuna", durationLabel: "Full Day", stopsLabel: "5 Stops", badge: "Popular", pricePrefix: "Starts From", priceAmount: 2500, priceSuffix: "", priceText: "", ctaLabel: "Book", whatsappMessage: "Hi, I want to book North Goa Tour", image: "pkg-north", source: SRC.packages, onPackagesPage: true },
  { key: "south", name: "South Goa Tour", summary: "Miramar • Dona Paula • Basilica • Colva • Churches", durationLabel: "Full Day", stopsLabel: "6 Stops", badge: "", pricePrefix: "Starts From", priceAmount: 2700, priceSuffix: "", priceText: "", ctaLabel: "Book", whatsappMessage: "Hi, I want to book South Goa Tour", image: "hero-2", source: SRC.packages, onPackagesPage: true, discrepancy: "Homepage shows “starts form ₹2,800 /Person”; /packages/ shows “Starts From ₹2,700”. Both preserved; confirm (Q5)." },
  { key: "dudhsagar", name: "Dudhsagar Trip", summary: "Jeep Safari • Waterfall • Spice Plantation", durationLabel: "Full Day", stopsLabel: "Adventure", badge: "", pricePrefix: "Starts From", priceAmount: 3500, priceSuffix: "", priceText: "", ctaLabel: "Book", whatsappMessage: "Hi, I want to book Dudhsagar Trip", image: "pkg-dudhsagar", source: SRC.packages, onPackagesPage: true, discrepancy: "Homepage shows “₹4,000 /Person”; /packages/ shows “Starts From ₹3,500”. Both preserved; confirm (Q5)." },
  { key: "sunset", name: "Sunset Cruise", summary: "Mandovi River • Live Music • Sunset Views", durationLabel: "Evening", stopsLabel: "Cruise", badge: "", pricePrefix: "Starts From", priceAmount: 1500, priceSuffix: "", priceText: "", ctaLabel: "Book", whatsappMessage: "Hi, I want to book Sunset Cruise", image: "pkg-cruise", source: SRC.packages, onPackagesPage: true, discrepancy: "Homepage shows “₹500 /Person”; /packages/ shows “Starts From ₹1,500”. Both preserved; confirm (Q5)." },
  { key: "custom", name: "Custom Tour", summary: "Plan your own itinerary with a dedicated vehicle.", durationLabel: "Flexible", stopsLabel: "Your Choice", badge: "", pricePrefix: "", priceAmount: null, priceSuffix: "", priceText: "Custom Pricing", ctaLabel: "Enquire", whatsappMessage: "Hi, I want a Custom Goa Tour", image: "pkg-custom", source: SRC.packages, onPackagesPage: true },
  { key: "airport-sightseeing", name: "Airport + Sightseeing", summary: "Airport pickup with same-day sightseeing package.", durationLabel: "Pickup Included", stopsLabel: "Flexible Route", badge: "", pricePrefix: "", priceAmount: null, priceSuffix: "", priceText: "Best Value", ctaLabel: "Book", whatsappMessage: "Hi, I want Airport Pickup with Sightseeing", image: "pkg-airport", source: SRC.packages, onPackagesPage: true },
  { key: "dinner", name: "Dinner Cruise", summary: "Luxury Dinner Cruise • Live Music • Buffet Dinner • DJ • Mandovi River", durationLabel: "Evening", stopsLabel: "Cruise", badge: "", pricePrefix: "", priceAmount: 1499, priceSuffix: "/Person", priceText: "", ctaLabel: "Book Now", whatsappMessage: "", image: "pkg-dinner", source: SRC.home, onPackagesPage: false },
];

/** Homepage card order and its own price wording (verbatim, including “starts form”). */
export const HOME_PACKAGE_ITEMS = [
  { key: "north", priceOverride: "Starts From ₹2,500", unitOverride: "/Person" },
  { key: "south", priceOverride: "starts form ₹2,800", unitOverride: "/Person" },
  { key: "dudhsagar", priceOverride: "₹4,000", unitOverride: "/Person" },
  { key: "sunset", priceOverride: "₹500", unitOverride: "/Person" },
  { key: "custom", hidePrice: true },
  { key: "dinner", priceOverride: "₹1,499", unitOverride: "/Person" },
];

export const VEHICLES = [
  { name: "Dzire", fullName: "Maruti Dzire", seatsLabel: "4 Seater", seats: 4, vehicleClass: "Sedan", airportLabel: "4 Seater Sedan", image: "vehicle-dzire", fares: [1250, 2500, 200, 20], airportFeatures: ["Airport Pickup Included", "Air Conditioned Vehicle", "Professional Driver"], whatsappMessage: "I want to book Dzire" },
  { name: "Ertiga", fullName: "Maruti Ertiga", seatsLabel: "6 Seater", seats: 6, vehicleClass: "MPV", airportLabel: "6 Seater MPV", image: "vehicle-ertiga", fares: [1550, 3000, 200, 22], airportFeatures: ["Airport Pickup Included", "Spacious Family Vehicle", "Comfortable AC Ride"], whatsappMessage: "I want to book Ertiga" },
  { name: "Innova", fullName: "Toyota Innova", seatsLabel: "7 Seater", seats: 7, vehicleClass: "SUV", airportLabel: "7 Seater SUV", image: "vehicle-innova", fares: [1750, 3500, 250, 25], airportFeatures: ["Premium Interior", "Extra Luggage Space", "Airport Meet & Greet"], whatsappMessage: "I want to book Innova" },
  { name: "Innova Crysta", fullName: "Innova Crysta", seatsLabel: "7 Seater", seats: 7, vehicleClass: "", airportLabel: "Luxury 7 Seater", image: "vehicle-crysta", fares: [2250, 4000, 300, 35], airportFeatures: ["Luxury Experience", "Premium Chauffeur", "Best For Families & Groups"], whatsappMessage: "I want to book Innova Crysta" },
];

export const HOTELS = [
  { name: "Royal Nirvana Resort", pricePrefix: "", priceAmount: 9300, description: "Comfortable resort perfect for families and couples looking for a relaxing stay in Goa.", amenities: ["Free WiFi", "Swimming Pool", "Restaurant", "Parking"] },
  { name: "WS Beach Resort", pricePrefix: "", priceAmount: 10800, description: "Beachside resort offering comfort, convenience and relaxing surroundings.", amenities: ["Free WiFi", "Pool", "Restaurant", "Parking"] },
  { name: "Palmarinha Resort", pricePrefix: "Starting From", priceAmount: 10800, description: "Spacious accommodation with excellent hospitality, perfect for guests looking for a relaxing holiday in Goa.", amenities: ["Free WiFi", "Swimming Pool", "Restaurant", "Parking"] },
  { name: "The Flora Residency", pricePrefix: "Starting From", priceAmount: 11400, description: "A modern and comfortable stay offering elegant rooms, excellent hospitality and easy access to Goa’s popular attractions.", amenities: ["Free WiFi", "Swimming Pool", "Restaurant", "Parking"] },
  { name: "Neelam The Glitz", pricePrefix: "Starting From", priceAmount: 13500, description: "Enjoy a stylish stay with spacious rooms, modern amenities and warm hospitality, making your Goa holiday truly memorable.", amenities: ["Free WiFi", "Swimming Pool", "Restaurant", "Parking"] },
  { name: "Sinq Beach Resort", pricePrefix: "Starting From", priceAmount: 13500, description: "A stylish beach resort offering modern rooms, a refreshing swimming pool, excellent dining and easy access to Goa’s vibrant beaches and nightlife.", amenities: ["Free WiFi", "Swimming Pool", "Restaurant", "Parking"] },
  { name: "Somy Plaza", pricePrefix: "Starting From", priceAmount: 17100, description: "Experience a premium stay with spacious rooms, quality hospitality, modern amenities and convenient access to Goa’s beaches, shopping and attractions.", amenities: ["Free WiFi", "Swimming Pool", "Restaurant", "Parking"] },
];

export const DESTINATIONS = [
  { title: "Beaches", summary: "Golden sands, turquoise waters, and unforgettable sunsets.", image: "exp-beaches" },
  { title: "Heritage", summary: "Explore centuries of Portuguese history and architecture.", image: "exp-heritage" },
  { title: "Adventure", summary: "Parasailing, scuba diving, jet skiing and more.", image: "exp-adventure" },
  { title: "Nature", summary: "Waterfalls, forests, spice plantations and hidden gems.", image: "exp-nature" },
  { title: "Nightlife", summary: "Beach clubs, music, cafés and vibrant evenings.", image: "exp-nightlife" },
];

export const TESTIMONIALS = [
  { authorName: "Rahul Sharma", authorLocation: "Bangalore", quote: "Excellent airport pickup service. The driver arrived on time, the car was very clean and our entire Goa trip was smooth. Highly recommended!" },
  { authorName: "Priya Nair", authorLocation: "Kochi", quote: "We booked an Innova Crysta for our family vacation. Professional driver, fixed pricing and excellent customer support." },
  { authorName: "Aditya Verma", authorLocation: "Mumbai", quote: "Their sightseeing package covered all major attractions in Goa. Very friendly service and worth every rupee." },
  { authorName: "Sneha Patel", authorLocation: "Ahmedabad", quote: "Booking through WhatsApp was very easy. Great communication and punctual service throughout our stay." },
  { authorName: "Rohan Mehta", authorLocation: "Pune", quote: "The taxi was spotless and the driver even suggested some hidden beaches. Fantastic local knowledge and amazing experience." },
  { authorName: "Anjali Kapoor", authorLocation: "Delhi", quote: "One of the best taxi services we’ve used in Goa. Safe driving, fair prices and very polite staff." },
];

export const FAQS = [
  { question: "Which airports do you provide pickup and drop services for?", answer: "We provide airport transfers from both Dabolim Airport and Manohar International Airport (Mopa) to any destination in Goa." },
  { question: "Can I pre-book my taxi before arriving in Goa?", answer: "Yes. You can pre-book your taxi through WhatsApp. Your driver will be ready before your arrival for a hassle-free pickup." },
  { question: "Are your taxi prices fixed?", answer: "Yes. All airport transfer prices are fixed. Any extra charges such as additional hours or kilometres will be explained before your trip begins." },
  { question: "Do you provide full-day sightseeing tours?", answer: "Absolutely. We offer North Goa, South Goa and fully customised sightseeing tours according to your travel plans." },
  { question: "Is your taxi service available 24×7?", answer: "Yes. Our airport transfer and taxi services are available round the clock, including early morning and late-night pickups." },
  { question: "Which payment methods do you accept?", answer: "We accept cash, UPI, Google Pay, PhonePe and bank transfers, making payments quick and convenient." },
];

/* ------------------------------------------------------------------ shared section data */

export const AIRPORT_SECTION = {
  eyebrow: "Airport Transfers",
  title: "Luxury Airport Pickup & Drop Service",
  headingLevel: "h2",
  description: "Enjoy hassle-free airport transfers from Dabolim and Mopa Airport. Professional chauffeurs, fixed pricing, flight tracking and comfortable vehicles available 24×7.",
  image: "airport",
  badgeTitle: "Dabolim & Mopa Airport",
  badgeText: "24×7 Pickup & Drop Service",
  introTitle: "Start Your Goa Trip Without Any Stress",
  introText: "Whether you’re arriving early in the morning or landing late at night, our experienced local drivers ensure a safe, comfortable and timely journey to your destination.",
  features: [
    { title: "Flight Tracking", text: "We monitor delays & arrivals." },
    { title: "Fixed Pricing", text: "No hidden charges." },
    { title: "Professional Drivers", text: "Verified local chauffeurs." },
    { title: "24×7 Support", text: "WhatsApp assistance anytime." },
  ],
  ctaTitle: "Ready To Book Your Airport Transfer?",
  ctaText: "From solo travellers to large families, we have the perfect vehicle waiting for you. Contact us now and enjoy a comfortable ride anywhere in Goa.",
  cta: { label: "Book Airport Transfer", kind: "booking", href: "", message: "Hi MBA Travels, I would like to book an Airport Transfer." },
  cardCta: { label: "Book Now", kind: "booking", href: "", message: "" },
};

/** Long-form copy that sat inside the homepage hero behind the slider (hidden text, cut off mid-sentence). */
export const HOME_HIDDEN_COPY = {
  title: "Goa Taxi Service: Comfortable and Reliable Travel Across Goa",
  body: [
    "Planning a holiday in Goa is easier when you have a dependable way to get around. Choosing a reliable Goa Taxi Service helps you travel at your own pace, organise your days comfortably, and make the most of your time without worrying about driving on unfamiliar roads.",
    "## A Convenient Way to Explore Goa",
    "Goa has many different places to visit, and they are spread across coastal areas, towns, and the countryside. A Goa Taxi Service can make it easier to travel between your hotel, beaches, attractions, and restaurants. With a Goa Taxi Service, you can plan a flexible journey that suits your schedule instead of trying to coordinate multiple transport options.",
    "Whether you are visiting for a weekend, a family holiday, a business trip, or a longer stay, choose a vehicle that matches your group size and luggage. Share your pickup location, destination, travel date, and preferred time when enquiring. Clear details help the service provider suggest a suitable option and explain the fare before your trip.",
    "## Goa Airport Taxi Transfers",
    "After landing at Goa’s airport, most visitors want a smooth journey to their hotel or accommodation. Arranging a Goa Taxi Service in advance can reduce waiting and make it easier to manage bags, children, or a late arrival. Tell the driver your flight details and destination, and confirm the pickup point and contact information before travelling.",
    "A Goa Taxi Service can also help with return airport transfers at the end of your holiday. Allow enough time for traffic, check your flight departure time, and agree on the pickup schedule beforehand. If your flight changes, contact the Goa Taxi Service provider as soon as possible so that arrangements can be reviewed. Always confirm the total fare and any additional charges before the ride.",
    "## Discover North Goa",
    "North Goa is popular for lively beaches, nightlife, shopping, cafés, and water-based activities. Visitors often include places such as Calangute, Baga, Candolim, Anjuna, Vagator, and Fort Aguada in their plans. A Goa Taxi Service gives you the flexibility to spend longer at the places you enjoy and move on when you are ready.",
    "During busy periods, roads and parking areas near popular beaches can become crowded. Plan your route with realistic travel times, especially around sunset and evening dining hours. If you want to visit several places in one day, discuss the itinerary and waiting time with your driver before starting. This makes the schedule clearer and helps avoid confusion a.",
  ].join("\n\n"),
};

export const CONTACT_BODY = [
  "## Why Choose Our Goa Taxi Service?",
  "Choosing a reliable Goa taxi service can make your holiday more comfortable and convenient. MBA Travels Goa helps travellers plan journeys across North Goa and South Goa with private taxi services for airport transfers, hotel pickups, sightseeing trips and local travel. Whether you are visiting Goa for a family holiday, a couple’s getaway or a business trip, you can contact our team to discuss your pickup location and travel requirements.",
  "## Goa Airport Transfers and Hotel Pickups",
  "Planning your arrival or departure? Our Goa taxi service can help you arrange transportation to or from Goa’s airports, hotels, resorts and other destinations, subject to availability. Share your flight details, pickup time, destination and passenger requirements when enquiring. Providing these details in advance helps us discuss suitable travel arrangements for your journey.",
  "## Private Taxi Service Across Goa",
  "Explore Goa at your own pace with a private taxi booking. You can enquire about travel between beaches, markets, restaurants, hotels and popular attractions. If you plan to visit several places in one day, share your preferred destinations so the route and timing can be discussed before your trip. Our team can help you enquire about a suitable taxi arrangement based on your itinerary and requirements.",
  "## Goa Sightseeing Tours",
  "Goa offers a variety of experiences, from beautiful beaches and historic churches to local markets and scenic coastal areas. If you are planning a sightseeing tour, prepare a list of places you would like to visit and let us know how much time you have available. We can discuss your travel plan, pickup point and transportation requirements to help you organise a convenient day of exploring Goa.",
  "## How to Book a Goa Taxi",
  "To enquire about our Goa taxi service, contact MBA Travels Goa through WhatsApp using the contact option above. Please share your travel date, pickup location, destination, number of passengers and preferred pickup time. For airport transfers, include your flight arrival or departure details. Our team can then discuss availability, pricing and booking arrangements with you before you confirm your journey.",
  "## Contact MBA Travels Goa",
  "Need help planning your next trip? Get in touch with MBA Travels Goa for information about private taxi bookings, airport transfers, hotel pickups and sightseeing travel. We recommend confirming your fare, pickup time and journey details before travelling. Contact us today to discuss your requirements and plan transportation for your Goa holiday.",
  "## Benefits of Our Goa Taxi Service",
  "Our Goa taxi service helps visitors travel comfortably between airports, hotels, beaches and popular tourist attractions. Whether you need a private cab for a family holiday, a couple’s trip or business travel, MBA Travels Goa can help you plan your journey. Share your pickup location, destination, travel date and preferred time to discuss your requirements. We also assist travellers looking for airport transfers, hotel pickups and sightseeing trips across North Goa and South Goa. Contact our team to enquire about availability and plan convenient transportation for your Goa holiday.",
].join("\n\n");
