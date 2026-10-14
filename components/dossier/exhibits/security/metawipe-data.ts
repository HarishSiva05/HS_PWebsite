// Script for the MetaWipe illustration (case 04). Every value is an example: the coordinates are
// the city-level point printed on this dossier's cover, the owner is Apple's own placeholder name,
// and the serial and image ID are made up.

export type Field = {
  label: string
  /** Label in the compact layout. */
  short: string
  value: string
  /** Value in the compact layout, when the full one doesn't fit. */
  valueShort?: string
}

export const FILE = "IMG_4127.HEIC"

export const FIELDS: Field[] = [
  { label: "GPS latitude", short: "Latitude", value: "43.8561° N" },
  { label: "GPS longitude", short: "Longitude", value: "79.3370° W" },
  { label: "GPS altitude", short: "Altitude", value: "211.4 m" },
  { label: "Location name", short: "Place", value: "Markham, ON" },
  { label: "Date taken", short: "Taken", value: "2025-06-21 06:12", valueShort: "2025-06-21" },
  { label: "Camera make", short: "Make", value: "Apple" },
  { label: "Camera model", short: "Model", value: "iPhone 15 Pro" },
  { label: "Lens", short: "Lens", value: "24 mm ƒ/1.78" },
  { label: "Software", short: "Software", value: "iOS 18.5" },
  { label: "Body serial", short: "Serial", value: "DNPXQ7Z3Q1GH", valueShort: "DNPX…Q1GH" },
  { label: "Owner name", short: "Owner", value: "John Appleseed", valueShort: "J. Appleseed" },
  { label: "Image unique ID", short: "Image ID", value: "7a1c9e04…b2d3", valueShort: "7a1c…b2d3" },
  { label: "Orientation", short: "Orientation", value: "1 · Horizontal", valueShort: "Horizontal" },
  { label: "Embedded thumbnail", short: "Thumbnail", value: "160 × 120 JPEG", valueShort: "160 × 120" },
]

// ---- timeline (ms) ----
export const T = { scan: 1200, clean: 5600, done: 6100, fade: 11600 } as const
/** How long the beam takes to cross the photo. */
export const SCAN = 4200
export const DURATION = 12200
/** The still frame: stripped, stamped, nothing fading. */
export const STILL_AT = 9000

/** Beam position (0..1 down the photo) at which field i is struck. */
export const strikeAt = (i: number) => (i + 0.75) / (FIELDS.length + 0.5)
export const STRIKES = FIELDS.map((_, i) => Math.round(T.scan + SCAN * strikeAt(i)))

export const MARKS = [T.scan, ...STRIKES, T.clean, T.done, T.fade] as const

/** Chips pinned on the photo (wide layout), each erased with the field it echoes. */
export const CHIPS = [
  { field: 4, text: "2025-06-21 · 06:12", icon: "clock" as const, x: "5%", y: strikeAt(4) - 0.05, side: "left" as const },
  { field: 6, text: "iPhone 15 Pro · 24 mm", icon: "camera" as const, x: "5%", y: strikeAt(6) - 0.05, side: "right" as const },
  { field: 10, text: "© John Appleseed", icon: "user" as const, x: "26%", y: strikeAt(10) - 0.05, side: "left" as const },
]

/** What the metadata looks like inside the file: drawn faintly over the photo until the beam wipes it. */
export const VEIL = [
  "GPSLatitude 43.8561 N",
  "GPSLongitude 79.3370 W",
  "GPSAltitude 211.4 m",
  "LocationName Markham ON",
  "DateTimeOriginal 2025:06:21 06:12:44",
  "Make Apple",
  "Model iPhone 15 Pro",
  "LensModel 24mm f/1.78",
  "Software 18.5",
  "BodySerialNumber DNPXQ7Z3Q1GH",
  "OwnerName John Appleseed",
  "ImageUniqueID 7a1c9e04b2d3f6a8",
  "Orientation 1",
  "ThumbnailImage 160x120",
].join("  ·  ")
