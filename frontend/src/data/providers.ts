import type { Location } from "@/domain";

export type SlotPayer = "NFZ" | "PRIVATE";

export type AppointmentSlot = {
  id: string;
  payer: SlotPayer;
  benefit: string;
  startsAt: string;
  providerName: string;
  address: string;
  pricePln?: number;
  doctorName?: string;
  referralRequired?: boolean;
  bookingUrl?: string;
};

export type SlotQuery = {
  benefit: string;
  location: Location;
  payer?: SlotPayer;
};

export type SlotProvider = {
  payer: SlotPayer;
  findSlots(query: SlotQuery): Promise<AppointmentSlot[]>;
};

export type BookingProvider = {
  buildBookingUrl(slot: AppointmentSlot): string | null;
};

export type ExtractedField = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  confidence: number;
};

export type DocumentProcessor = {
  extract(file: File): Promise<ExtractedField[]>;
};
