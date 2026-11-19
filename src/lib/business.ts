// Real Newton's Hub details from the canonical source of truth.
export const BUSINESS = {
  name: "Newton's Hub",
  tagline: "We Buy • We Sell • We Swap — Where quality meets affordability.",
  email: "newtonr710@gmail.com",
  phone: "0544182034",
  secondaryPhone: "0554382367",
  whatsapp: "0544182034",
  instagram: "@newtonhub_",
  instagramUrl: "https://instagram.com/newtonhub_",
  pickupLocations: ["Breman Essiam", "UMaT Campus (Tarkwa)"],
  momo: { number: "0544182034", accountName: "Richard Tawiah" },
  deliveryNote: "Delivery fee is confirmed with you after you place your order.",
  returnPolicy: "Returns or exchanges within 3 days, with the item in its box.",
  reservation: "Unpaid reservations are held for one day.",
} as const;

/** WhatsApp share link with no fixed recipient (the shopper picks a chat). */
export function whatsappShareLink(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function whatsappLink(message: string) {
  const digits = "233" + BUSINESS.whatsapp.replace(/^0/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
