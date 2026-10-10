// School lunches: the Carmarthenshire School Catering Service primary menu, copied from the
// council's PDF (shared with parents on ParentPay). The council runs a 3-week cycle and
// publishes a new menu twice a year (May and October). To update: replace CURRENT_MENU
// with the new menu's weeks and its week-commencing dates.

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

type MenuCycle = {
    name: string;
    endsOn: string; // last school day this menu covers (ISO date)
    // Monday of each school week -> which menu week (1, 2 or 3) runs that week
    weekStarts: Record<string, 1 | 2 | 3>;
    weeks: Record<1 | 2 | 3, Record<WeekDay, LunchDay>>;
};

const JACKET = 'Jacket Potato with Choice of Filling';
const PASTA = 'Tomato & Basil Pasta Bake';

const CURRENT_MENU: MenuCycle = {
    name: 'Primary Summer Menu 2026',
    endsOn: '2026-10-23',
    weekStarts: {
        '2026-08-31': 1, '2026-09-07': 2, '2026-09-14': 3,
        '2026-09-21': 1, '2026-09-28': 2, '2026-10-05': 3,
        '2026-10-12': 1, '2026-10-19': 2,
    },
    weeks: {
        1: {
            monday: { main: 'Welsh Pork Sausage/Sausage Pattie', vegetarian: 'Vegetable Sausage', alternative: PASTA, sides: 'Omelette, Brunch Fries, Baked Beans and Tomatoes', salad: 'Sweetcorn', dessert: 'Ice Cream and Peaches' },
            tuesday: { main: 'Chicken Korma', vegetarian: 'Vegetable Korma', alternative: JACKET, sides: 'Mixed Rice, Seasonal Vegetables and Peas', salad: 'Mixed Salad', dessert: 'Oat Biscuit and Orange Wedges' },
            wednesday: { main: 'Welsh Beef Cottage Pie', vegetarian: 'Lentil and Vegetable Cottage Pie', alternative: PASTA, sides: 'Carrots, Broccoli and Gravy', salad: 'Mixed Salad', dessert: 'Cheese, Crackers and Sliced Apple' },
            thursday: { main: 'Turkey Pasta Bake', vegetarian: 'Cheese & Tomato Pasta Bake', alternative: JACKET, sides: 'Garlic Bread, Coleslaw and Peas', salad: 'Mixed Salad', dessert: 'Lemon Drizzle Muffin and Fruit Wedges' },
            friday: { main: 'Fish Finger Wrap', vegetarian: 'Hot Pizza Wrap', alternative: PASTA, sides: 'Potato Wedges or Mashed Potato, Cucumber and Baked Beans', salad: 'Mixed Salad', dessert: 'Chocolate Banana Cake and Sliced Banana' },
        },
        2: {
            monday: { main: 'Welsh Sausage Ragu Pasta Bake', vegetarian: 'Mac & Cheese', alternative: JACKET, sides: 'Garlic Bread, Carrots and Broccoli', salad: 'Beetroot', dessert: 'Chocolate Brownie and Fruit Coulis' },
            tuesday: { main: 'Summer Pizza', vegetarian: 'Summer Pizza', alternative: PASTA, sides: 'Chips or Half Jacket Potato, Baked Beans and Peas', salad: 'Mixed Salad', dessert: 'Cheese, Crackers and Sliced Apple' },
            wednesday: { main: 'Peri Peri Chicken Wrap', vegetarian: 'Halloumi Hot Wrap', alternative: JACKET, sides: 'Diced Potatoes, Coleslaw and Cucumber Salad, Tomato Salsa', salad: 'Sweetcorn', dessert: 'Apple Cake and Custard' },
            thursday: { main: 'Welsh Beef Chilli', vegetarian: 'Vegetarian Chilli', alternative: PASTA, sides: 'Mixed Rice, Tortilla Triangles, Sweetcorn and Diced Cucumber', salad: 'Mixed Salad', dessert: 'Yoghurt and Peaches' },
            friday: { main: 'Fish Bites', vegetarian: 'Quorn Nuggets', alternative: JACKET, sides: 'Jacket Potato, Peas and Baked Beans', salad: 'Mixed Salad', dessert: 'Chocolate Flapjack and Fruit Wedges' },
        },
        3: {
            monday: { main: 'Honey and Soy Chicken', vegetarian: 'Honey and Soy Quorn', alternative: PASTA, sides: 'Vegetable Noodles or Mixed Rice, Peas and Sweetcorn', salad: 'Mixed Salad', dessert: 'Chocolate Cookie, Orange Wedges and Glass of Welsh Milk' },
            tuesday: { main: 'Pork and Carrot Meatball Sub Sandwich', vegetarian: 'Vege Meatball Sub Sandwich', alternative: JACKET, sides: 'Potato Wedges, Coleslaw and Mixed Salad', salad: 'Sweetcorn', dessert: 'Banana Split' },
            wednesday: { main: 'Roast Turkey', vegetarian: 'Vegetable Sausage', alternative: PASTA, sides: 'Stuffing, Mashed Potato, Carrots, Green Beans and Gravy', salad: 'Mixed Salad', dessert: 'Yogurt and Summer Chopped Fruit' },
            thursday: { main: 'Welsh Beef Bolognaise', vegetarian: 'Lentil Bolognaise', alternative: JACKET, sides: 'Pasta, Garlic Bread, Broccoli and Cauliflower', salad: 'Mixed Salad', dessert: 'Carrot and Apple Muffin, Fruit Wedges' },
            friday: { main: 'Breaded Salmon Fillet', vegetarian: 'Haloumi Burger', alternative: PASTA, sides: 'Chips or Mashed Potato, Baked Beans and Peas', salad: 'Mixed Salad', dessert: 'Apple Crumble & Ice Cream' },
        },
    },
};

export const COUNCIL_MENU_URL = 'https://www.carmarthenshire.gov.wales/council-services/education-schools/school-meals/primary-school-meals/';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The school week to show for a date: this week on weekdays, next week at the weekend.
export function schoolWeekStart(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const toMonday = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
    d.setDate(d.getDate() + toMonday);
    return d;
}

export type WeekMenu = { weekStart: Date; weekNumber: 1 | 2 | 3; days: Record<WeekDay, LunchDay> };

// null when that week is not covered (holidays, or after the menu ends and before the next is added)
export function weekMenuFor(date: Date): WeekMenu | null {
    const weekStart = schoolWeekStart(date);
    const weekNumber = CURRENT_MENU.weekStarts[iso(weekStart)];
    if (!weekNumber) return null;
    return { weekStart, weekNumber, days: CURRENT_MENU.weeks[weekNumber] };
}
