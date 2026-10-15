// School lunches: the Carmarthenshire School Catering Service primary menu, copied from the
// council's PDF (shared with parents on ParentPay). The council runs a 3-week cycle and
// publishes a new menu twice a year (May and October). The school adds each new menu in the
// admin area (/admin/menu, saved in Firestore's lunchMenus). BUILT_IN_MENU is the menu that was
// typed in before the editor existed; it still shows for the weeks it covers.
import { TERMS } from './termDates';

export type LunchDay = {
    main: string;
    vegetarian: string;
    alternative: string;
    sides: string;
    salad: string;
    dessert: string;
};

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
export const WEEK_DAYS: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export type MenuWeekNumber = '1' | '2' | '3';
export const MENU_WEEKS: MenuWeekNumber[] = ['1', '2', '3'];

// One council menu. Week 1 runs in the first school week on or after startsOn, then weeks 2 and 3,
// then back to 1. Holiday weeks are skipped (see isSchoolWeek), as the council's own dates do.
// Menus change over in whole weeks: a menu covers every school week from the week of its first
// school day to the week containing endsOn (the council's menus start on a Monday and end on a Friday).
export type LunchMenu = {
    name: string;
    startsOn: string; // first school day of week 1 (ISO date)
    endsOn: string;   // last school day this menu covers (ISO date)
    weeks: Record<MenuWeekNumber, Record<WeekDay, LunchDay>>;
};
export type LunchMenuWithId = LunchMenu & { id: string };

const JACKET = 'Jacket Potato with Choice of Filling';
const PASTA = 'Tomato & Basil Pasta Bake';

export const BUILT_IN_MENU: LunchMenu = {
    name: 'Primary Summer Menu 2026',
    startsOn: '2026-08-31',
    endsOn: '2026-10-23',
    weeks: {
        '1': {
            monday: { main: 'Welsh Pork Sausage/Sausage Pattie', vegetarian: 'Vegetable Sausage', alternative: PASTA, sides: 'Omelette, Brunch Fries, Baked Beans and Tomatoes', salad: 'Sweetcorn', dessert: 'Ice Cream and Peaches' },
            tuesday: { main: 'Chicken Korma', vegetarian: 'Vegetable Korma', alternative: JACKET, sides: 'Mixed Rice, Seasonal Vegetables and Peas', salad: 'Mixed Salad', dessert: 'Oat Biscuit and Orange Wedges' },
            wednesday: { main: 'Welsh Beef Cottage Pie', vegetarian: 'Lentil and Vegetable Cottage Pie', alternative: PASTA, sides: 'Carrots, Broccoli and Gravy', salad: 'Mixed Salad', dessert: 'Cheese, Crackers and Sliced Apple' },
            thursday: { main: 'Turkey Pasta Bake', vegetarian: 'Cheese & Tomato Pasta Bake', alternative: JACKET, sides: 'Garlic Bread, Coleslaw and Peas', salad: 'Mixed Salad', dessert: 'Lemon Drizzle Muffin and Fruit Wedges' },
            friday: { main: 'Fish Finger Wrap', vegetarian: 'Hot Pizza Wrap', alternative: PASTA, sides: 'Potato Wedges or Mashed Potato, Cucumber and Baked Beans', salad: 'Mixed Salad', dessert: 'Chocolate Banana Cake and Sliced Banana' },
        },
        '2': {
            monday: { main: 'Welsh Sausage Ragu Pasta Bake', vegetarian: 'Mac & Cheese', alternative: JACKET, sides: 'Garlic Bread, Carrots and Broccoli', salad: 'Beetroot', dessert: 'Chocolate Brownie and Fruit Coulis' },
            tuesday: { main: 'Summer Pizza', vegetarian: 'Summer Pizza', alternative: PASTA, sides: 'Chips or Half Jacket Potato, Baked Beans and Peas', salad: 'Mixed Salad', dessert: 'Cheese, Crackers and Sliced Apple' },
            wednesday: { main: 'Peri Peri Chicken Wrap', vegetarian: 'Halloumi Hot Wrap', alternative: JACKET, sides: 'Diced Potatoes, Coleslaw and Cucumber Salad, Tomato Salsa', salad: 'Sweetcorn', dessert: 'Apple Cake and Custard' },
            thursday: { main: 'Welsh Beef Chilli', vegetarian: 'Vegetarian Chilli', alternative: PASTA, sides: 'Mixed Rice, Tortilla Triangles, Sweetcorn and Diced Cucumber', salad: 'Mixed Salad', dessert: 'Yoghurt and Peaches' },
            friday: { main: 'Fish Bites', vegetarian: 'Quorn Nuggets', alternative: JACKET, sides: 'Jacket Potato, Peas and Baked Beans', salad: 'Mixed Salad', dessert: 'Chocolate Flapjack and Fruit Wedges' },
        },
        '3': {
            monday: { main: 'Honey and Soy Chicken', vegetarian: 'Honey and Soy Quorn', alternative: PASTA, sides: 'Vegetable Noodles or Mixed Rice, Peas and Sweetcorn', salad: 'Mixed Salad', dessert: 'Chocolate Cookie, Orange Wedges and Glass of Welsh Milk' },
            tuesday: { main: 'Pork and Carrot Meatball Sub Sandwich', vegetarian: 'Vege Meatball Sub Sandwich', alternative: JACKET, sides: 'Potato Wedges, Coleslaw and Mixed Salad', salad: 'Sweetcorn', dessert: 'Banana Split' },
            wednesday: { main: 'Roast Turkey', vegetarian: 'Vegetable Sausage', alternative: PASTA, sides: 'Stuffing, Mashed Potato, Carrots, Green Beans and Gravy', salad: 'Mixed Salad', dessert: 'Yogurt and Summer Chopped Fruit' },
            thursday: { main: 'Welsh Beef Bolognaise', vegetarian: 'Lentil Bolognaise', alternative: JACKET, sides: 'Pasta, Garlic Bread, Broccoli and Cauliflower', salad: 'Mixed Salad', dessert: 'Carrot and Apple Muffin, Fruit Wedges' },
            friday: { main: 'Breaded Salmon Fillet', vegetarian: 'Haloumi Burger', alternative: PASTA, sides: 'Chips or Mashed Potato, Baked Beans and Peas', salad: 'Mixed Salad', dessert: 'Apple Crumble & Ice Cream' },
        },
    },
};

export const COUNCIL_MENU_URL = 'https://www.carmarthenshire.gov.wales/council-services/education-schools/school-meals/primary-school-meals/';

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (day: string) => new Date(`${day}T12:00:00`);
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

// The school week to show for a date: this week on weekdays, next week at the weekend.
export function schoolWeekStart(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const toMonday = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
    d.setDate(d.getDate() + toMonday);
    return d;
}

// A weekday the school is open, going by the term dates. Outside the dates we know about
// (before the first term or after the last), every weekday counts as open.
function isSchoolDay(d: Date): boolean {
    if (d.getDay() === 0 || d.getDay() === 6) return false;
    const day = iso(d);
    if (TERMS.length === 0 || day < TERMS[0].starts || day > TERMS[TERMS.length - 1].ends) return true;
    return TERMS.some((t) => day >= t.starts && day <= t.ends && !(day >= t.halfTerm[0] && day <= t.halfTerm[1]));
}

const isSchoolWeek = (monday: Date) => [0, 1, 2, 3, 4].some((i) => isSchoolDay(addDays(monday, i)));

// The Monday of the week where the menu's week 1 runs: the week of the first school day on or after
// startsOn (so a start date on a weekend or in a holiday still begins at week 1)
function firstMenuMonday(menu: LunchMenu): Date {
    let day = fromIso(menu.startsOn);
    for (let i = 0; i < 120 && !isSchoolDay(day); i++) day = addDays(day, 1);
    return mondayOf(day);
}

// Which menu week (1, 2 or 3) runs in the school week starting on this Monday, or null when the
// menu does not cover it (before it starts, after it ends, or a holiday week)
export function menuWeekNumber(menu: LunchMenu, monday: Date): 1 | 2 | 3 | null {
    const first = firstMenuMonday(menu);
    if (monday < first || iso(monday) > menu.endsOn || !isSchoolWeek(monday)) return null;
    let schoolWeeks = 0;
    for (let m = first; m <= monday; m = addDays(m, 7)) {
        if (isSchoolWeek(m)) schoolWeeks++;
    }
    return (((schoolWeeks - 1) % 3) + 1) as 1 | 2 | 3;
}

// Every school week a menu covers, for checking against the council's dates in the admin area
export function menuSchedule(menu: LunchMenu): { weekStart: Date; weekNumber: 1 | 2 | 3 }[] {
    if (!menu.startsOn || !menu.endsOn || menu.startsOn > menu.endsOn) return [];
    const weeks: { weekStart: Date; weekNumber: 1 | 2 | 3 }[] = [];
    for (let m = firstMenuMonday(menu); iso(m) <= menu.endsOn && weeks.length < 60; m = addDays(m, 7)) {
        const weekNumber = menuWeekNumber(menu, m);
        if (weekNumber) weeks.push({ weekStart: m, weekNumber });
    }
    return weeks;
}

export type WeekMenu = { weekStart: Date; weekNumber: 1 | 2 | 3; days: Record<WeekDay, LunchDay>; menuName: string };

const DISH_KEYS: (keyof LunchDay)[] = ['main', 'vegetarian', 'alternative', 'sides', 'salad', 'dessert'];
// A real calendar date written as YYYY-MM-DD (so 2026-02-31 and 2026-99-99 are refused)
export function isRealIsoDay(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// A menu read from the database, checked and filled out so the public pages can always show it:
// any missing dish becomes empty text. Returns null for anything without a name and valid dates.
export function cleanLunchMenu(raw: unknown): LunchMenu | null {
    const data = raw as Partial<LunchMenu> | null;
    if (!data || typeof data.name !== 'string' || !data.name.trim() || !isRealIsoDay(data.startsOn) || !isRealIsoDay(data.endsOn) || data.startsOn > data.endsOn) {
        return null;
    }
    const weeks = Object.fromEntries(MENU_WEEKS.map((week) => [week, Object.fromEntries(WEEK_DAYS.map((day) => {
        const dishes = (data.weeks as Record<string, Record<string, Record<string, unknown>> | undefined> | undefined)?.[week]?.[day];
        return [day, Object.fromEntries(DISH_KEYS.map((key) => [key, typeof dishes?.[key] === 'string' ? dishes[key] : '']))];
    }))])) as LunchMenu['weeks'];
    return { name: data.name, startsOn: data.startsOn, endsOn: data.endsOn, weeks };
}

// The menus to choose from: menus added in the admin area first (newest start first), then the built-in one
const allMenus = (savedMenus: LunchMenu[]) =>
    [...savedMenus].sort((a, b) => (a.startsOn < b.startsOn ? 1 : -1)).concat(BUILT_IN_MENU);

// null when that week is not covered (holidays, or after the menu ends and before the next is added)
export function weekMenuFor(date: Date, savedMenus: LunchMenu[] = []): WeekMenu | null {
    const weekStart = schoolWeekStart(date);
    for (const menu of allMenus(savedMenus)) {
        const weekNumber = menuWeekNumber(menu, weekStart);
        if (weekNumber) return { weekStart, weekNumber, days: menu.weeks[String(weekNumber) as MenuWeekNumber], menuName: menu.name };
    }
    return null;
}

// For the admin reminder: the first school week in the next few weeks with no menu, or null if all are covered
export function firstWeekWithoutMenu(today: Date, savedMenus: LunchMenu[] = [], weeksAhead = 4): Date | null {
    let monday = schoolWeekStart(today);
    // The 30-week cap is only a safety net; a long holiday is at most a few weeks
    for (let looked = 0, checked = 0; looked < 30 && checked < weeksAhead; looked++, monday = addDays(monday, 7)) {
        if (!isSchoolWeek(monday)) continue;
        checked++;
        if (!weekMenuFor(monday, savedMenus)) return monday;
    }
    return null;
}
