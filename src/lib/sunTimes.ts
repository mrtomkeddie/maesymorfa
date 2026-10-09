// Sunrise and sunset for any date and place, using the standard solar-position formulas
// (the same approach as the SunCalc library). Accurate to about a minute, which is plenty for a sky colour.

const rad = Math.PI / 180;
const dayMs = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const obliquity = rad * 23.4397;

const toDays = (date: Date) => date.valueOf() / dayMs - 0.5 + J1970 - J2000;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M: number) {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + Math.PI;
}

const declination = (L: number) => Math.asin(Math.sin(obliquity) * Math.sin(L));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

export function sunTimes(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } {
    const lw = rad * -lng;
    const phi = rad * lat;
    const d = toDays(date);
    const n = Math.round(d - J0 - lw / (2 * Math.PI));
    const ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = declination(L);
    const Jnoon = solarTransitJ(ds, M, L);

    // The sun's top edge touching the horizon, allowing for the air bending the light
    const h0 = -0.833 * rad;
    const w = Math.acos((Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const Jset = solarTransitJ(approxTransit(w, lw, n), M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
}

// Ysgol Maes Y Morfa, Olive Street, Llanelli (from the map on the school's contact page)
export const SCHOOL_LAT = 51.6707;
export const SCHOOL_LNG = -4.146;
