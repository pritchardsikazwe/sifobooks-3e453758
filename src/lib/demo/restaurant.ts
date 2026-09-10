import type { DemoIndustry } from "./types";

/** SAMPLE DATA ONLY — see src/lib/demo/types.ts for the safety contract. */
export const restaurantDemo: DemoIndustry = {
  slug: "restaurant",
  name: "Restaurant",
  product: "SifoRestaurant",
  tagline: "Floor, kitchen, stock and cash-up — a full restaurant operation, not just a till.",
  description:
    "Run a service end to end: seat a table, fire courses to the kitchen, split the bill, 86 an item, count the drawer, and see the recipe cost and profit behind every plate.",
  highlights: ["Floor plan & table states", "Kitchen display & tickets", "Recipe costing & wastage", "Shift cash-up & audit"],
  accent: {
    gradient: "from-amber-500/15 via-orange-500/10 to-background",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/30",
  },
  sections: [
    {
      slug: "dashboard",
      iconName: "LayoutDashboard",
      name: "Dashboard",
      group: "Overview",
      blurb: "Today's service performance in one view.",
      kpis: [
        { label: "Sales today", value: "K 68,420", tone: "good" },
        { label: "Covers", value: "214" },
        { label: "Average spend", value: "K 320" },
        { label: "Open tables", value: "9", tone: "warn" },
        { label: "Avg ticket time", value: "14 min", tone: "good" },
        { label: "Gross margin", value: "63%", tone: "good" },
      ],
      actions: [
        { label: "Open a table", variant: "primary", section: "floor-plan" },
        { label: "New order", section: "pos" },
        { label: "Kitchen board", section: "kitchen" },
      ],
      blocks: [
        {
          kind: "chart",
          variant: "line",
          title: "Sales trend — last 7 days",
          note: "Sample figures. Dinner service carries the week.",
          unit: "K ",
          series: [
            { label: "Mon", value: 41200 },
            { label: "Tue", value: 38600 },
            { label: "Wed", value: 47300 },
            { label: "Thu", value: 52100 },
            { label: "Fri", value: 74800 },
            { label: "Sat", value: 91400 },
            { label: "Sun", value: 68420 },
          ],
        },
        {
          kind: "chart",
          variant: "donut",
          title: "Payment mix today",
          unit: "K ",
          series: [
            { label: "Mobile money", value: 28640 },
            { label: "Card", value: 21980 },
            { label: "Cash", value: 14300 },
            { label: "Room charge", value: 3500 },
          ],
        },
        {
          kind: "grid",
          title: "Quick actions",
          cells: [
            { label: "Open a table", sub: "Seat walk-in guests", tone: "info" },
            { label: "New order", sub: "Waiter order entry", tone: "good" },
            { label: "Kitchen board", sub: "6 tickets in prep", tone: "warn" },
            { label: "Close shift", sub: "Cashier cash-up", tone: "neutral" },
          ],
        },
        {
          kind: "table",
          title: "Sales by service period",
          columns: ["Period", "Covers", "Sales", "Avg spend", "Discounts", "Status"],
          numericColumns: [1, 2, 3, 4],
          statusColumn: 5,
          rows: [
            ["Breakfast", 42, "K 8,120", "K 193", "K 240", "Closed"],
            ["Lunch", 96, "K 28,640", "K 298", "K 1,120", "Closed"],
            ["Dinner", 76, "K 31,660", "K 417", "K 860", "In service"],
          ],
        },
        {
          kind: "notes",
          title: "Service alerts",
          lines: [
            "Grilled tilapia is 86'd — 0 portions left, kitchen notified the floor.",
            "Table 12 has been open 96 minutes with no course fired since starters.",
            "Two discounts above 10% today are awaiting manager review.",
          ],
        },
      ],
    },

    {
      slug: "floor-plan",
      iconName: "Grid3x3",
      name: "Floor & tables",
      group: "Floor",
      blurb: "Live table map by dining area.",
      kpis: [
        { label: "Tables", value: "34" },
        { label: "Occupied", value: "18", tone: "info" },
        { label: "Reserved", value: "5", tone: "warn" },
        { label: "Free", value: "11", tone: "good" },
      ],
      actions: [
        { label: "Open table", variant: "primary", section: "pos" },
        { label: "New reservation", section: "reservations" },
        { label: "Transfer / merge", section: "table-actions" },
        { label: "Pay bill", section: "payments" },
      ],
      blocks: [
        {
          kind: "map",
          title: "Live floor plan",
          note: "Tap a table to open its order. Colours follow the standard service states.",
          legend: [
            { label: "Available", tone: "good" },
            { label: "Occupied", tone: "info" },
            { label: "Reserved", tone: "warn" },
            { label: "Awaiting payment", tone: "bad" },
          ],
          areas: [
            {
              label: "Main dining",
              cells: [
                { label: "T1", state: "Occupied", tone: "info", meta: "4 guests · Chanda", amount: "K 1,240" },
                { label: "T2", state: "Available", tone: "good", meta: "Seats 2" },
                { label: "T3", state: "Reserved", tone: "warn", meta: "19:30 · Mwale, 6" },
                { label: "T4", state: "Occupied", tone: "info", meta: "2 guests · Banda", amount: "K 680" },
                { label: "T5", state: "Payment", tone: "bad", meta: "5 guests", amount: "K 2,410" },
                { label: "T6", state: "Available", tone: "good", meta: "Seats 4" },
                { label: "T7", state: "Occupied", tone: "info", meta: "3 guests · Zulu", amount: "K 905" },
                { label: "T8", state: "Available", tone: "good", meta: "Seats 4" },
                { label: "T9", state: "Reserved", tone: "warn", meta: "20:00 · Phiri, 2" },
                { label: "T10", state: "Occupied", tone: "info", meta: "6 guests · Tembo", amount: "K 3,180" },
              ],
            },
            {
              label: "Terrace",
              cells: [
                { label: "P1", state: "Occupied", tone: "info", meta: "2 guests", amount: "K 420" },
                { label: "P2", state: "Available", tone: "good", meta: "Seats 6" },
                { label: "P3", state: "Payment", tone: "bad", meta: "4 guests", amount: "K 1,760" },
                { label: "P4", state: "Available", tone: "good", meta: "Seats 2" },
                { label: "P5", state: "Reserved", tone: "warn", meta: "19:00 · Sakala, 4" },
              ],
            },
            {
              label: "Private room",
              cells: [
                { label: "VIP1", state: "Occupied", tone: "info", meta: "10 guests · set menu", amount: "K 9,600" },
                { label: "VIP2", state: "Available", tone: "good", meta: "Seats 12" },
              ],
            },
          ],
        },
        {
          kind: "grid",
          title: "Main dining room",
          cells: [
            { label: "T1", sub: "2 seats · Free", tone: "good" },
            { label: "T2", sub: "4 seats · Occupied · K 1,240", tone: "info" },
            { label: "T3", sub: "4 seats · Occupied · K 860", tone: "info" },
            { label: "T4", sub: "6 seats · Reserved 19:30", tone: "warn", badge: "R. Tembo" },
            { label: "T5", sub: "2 seats · Free", tone: "good" },
            { label: "T6", sub: "4 seats · Bill printed", tone: "warn" },
            { label: "T7", sub: "8 seats · Occupied · K 3,410", tone: "info" },
            { label: "T8", sub: "2 seats · Needs clearing", tone: "bad" },
          ],
        },
        {
          kind: "grid",
          title: "Terrace & bar",
          cells: [
            { label: "TR1", sub: "4 seats · Occupied", tone: "info" },
            { label: "TR2", sub: "4 seats · Free", tone: "good" },
            { label: "TR3", sub: "6 seats · Reserved 20:00", tone: "warn" },
            { label: "B1", sub: "Bar stool · Occupied", tone: "info" },
            { label: "B2", sub: "Bar stool · Free", tone: "good" },
            { label: "T12", sub: "4 seats · Open 96 min", tone: "bad", badge: "Check on" },
          ],
        },
      ],
    },

    {
      slug: "areas-tables",
      iconName: "Table2",
      name: "Dining areas",
      group: "Floor",
      blurb: "Areas, seating capacity and table configuration.",
      blocks: [
        {
          kind: "table",
          title: "Areas",
          columns: ["Area", "Tables", "Seats", "Service style", "Default waiter", "Status"],
          numericColumns: [1, 2],
          statusColumn: 5,
          rows: [
            ["Main dining room", 16, 62, "Table service", "Mwape C.", "Open"],
            ["Terrace", 10, 40, "Table service", "Bwalya N.", "Open"],
            ["Bar", 6, 12, "Counter", "Chileshe M.", "Open"],
            ["Private room", 2, 20, "Set menu", "Duty manager", "Bookings only"],
          ],
        },
      ],
    },

    {
      slug: "waiters",
      iconName: "UserRound",
      name: "Waiters & sections",
      group: "Floor",
      blurb: "Who is on the floor, what they cover and how they are selling.",
      blocks: [
        {
          kind: "table",
          title: "Floor team tonight",
          columns: ["Waiter", "Section", "Open tables", "Covers", "Sales", "Status"],
          numericColumns: [2, 3, 4],
          statusColumn: 5,
          rows: [
            ["Mwape C.", "Main 1–8", 4, 26, "K 9,860", "On floor"],
            ["Bwalya N.", "Terrace", 3, 18, "K 6,240", "On floor"],
            ["Chileshe M.", "Bar", 2, 14, "K 3,120", "On floor"],
            ["Kunda P.", "Main 9–16", 0, 12, "K 4,410", "On break"],
          ],
        },
      ],
    },

    {
      slug: "reservations",
      iconName: "CalendarDays",
      name: "Reservations",
      group: "Floor",
      blurb: "Tonight's bookings and the guests behind them.",
      actions: [
        { label: "New reservation", variant: "primary" },
        { label: "Confirm" },
        { label: "Seat guest", section: "floor-plan" },
        { label: "Cancel", variant: "ghost" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Tonight's bookings",
          columns: ["Time", "Guest", "Party", "Table", "Notes", "Status"],
          numericColumns: [2],
          statusColumn: 5,
          rows: [
            ["18:30", "N. Chanda", 2, "T5", "Anniversary", "Seated"],
            ["19:00", "Copperbelt Tours", 8, "T7", "Set menu B", "Seated"],
            ["19:30", "R. Tembo", 6, "T4", "High chair needed", "Confirmed"],
            ["20:00", "L. Phiri", 4, "TR3", "Terrace requested", "Confirmed"],
            ["20:30", "M. Banda", 2, "—", "Walk-in waitlist", "Waiting"],
          ],
        },
      ],
    },

    {
      slug: "pos",
      iconName: "ShoppingCart",
      name: "Orders — order entry",
      group: "Service",
      blurb: "The touchscreen order screen: pick the table, fire the course, hold the rest.",
      actions: [
        { label: "Send to kitchen", variant: "primary", section: "kitchen" },
        { label: "Hold order" },
        { label: "Print bill" },
        { label: "Pay", section: "payments" },
      ],
      blocks: [
        {
          kind: "menu",
          title: "Order entry — Table 7",
          note: "Category buttons on top, item tiles below, running ticket to the right in the live product.",
          categories: ["Starters", "Grills", "Local", "Sides", "Desserts", "Drinks"],
          items: [
            { name: "Beef fillet 250g", price: "K 310", category: "Grills", tags: ["Med-rare", "Peri sauce"], state: "Available" },
            { name: "Grilled tilapia", price: "K 265", category: "Grills", tags: ["Whole fish"], state: "86'd", tone: "bad" },
            { name: "Chicken curry", price: "K 190", category: "Local", tags: ["Mild", "Hot"], state: "Available" },
            { name: "Nshima & relish", price: "K 95", category: "Local", state: "Available" },
            { name: "Chips", price: "K 55", category: "Sides", tags: ["Masala"], state: "Available" },
            { name: "Garden salad", price: "K 70", category: "Starters", state: "Available" },
            { name: "Malva pudding", price: "K 85", category: "Desserts", state: "Low stock", tone: "warn" },
            { name: "Mosi lager", price: "K 45", category: "Drinks", state: "Available" },
          ],
        },
        {
          kind: "flow",
          title: "Service flow for this order",
          steps: [
            { label: "Seat table", detail: "T7 · 3 guests", state: "Done", tone: "good" },
            { label: "Take order", detail: "5 lines · 2 modifiers", state: "In progress", tone: "info" },
            { label: "Send to kitchen", detail: "Starters first", state: "Next", tone: "warn" },
            { label: "Serve", detail: "Course pacing", state: "Waiting" },
            { label: "Bill & pay", detail: "Split available", state: "Waiting" },
          ],
        },
        {
          kind: "panel",
          title: "Table 7 · Copperbelt Tours · 8 covers · Waiter Mwape C.",
          items: [
            { label: "Order type", value: "Dine-in · Set menu B" },
            { label: "Opened", value: "19:02 · 41 minutes ago" },
            { label: "Course status", value: "Starters served · mains fired", tone: "info" },
            { label: "Running total", value: "K 3,410" },
            { label: "Service charge 10%", value: "K 341" },
            { label: "VAT 16%", value: "K 600" },
          ],
        },
        {
          kind: "table",
          title: "Order lines",
          columns: ["Qty", "Item", "Modifiers", "Course", "Line total", "Status"],
          numericColumns: [0, 4],
          statusColumn: 5,
          rows: [
            [4, "Caesar salad", "No anchovy x2", "Starter", "K 340", "Served"],
            [2, "Chicken curry", "Medium spice", "Main", "K 330", "Fired"],
            [3, "Beef stir fry", "Well done x1, extra veg", "Main", "K 600", "Fired"],
            [3, "Nshima & relish", "—", "Main", "K 285", "Fired"],
            [8, "Mosi lager", "—", "Drinks", "K 280", "Served"],
            [6, "Fresh juice", "No ice", "Drinks", "K 240", "Served"],
          ],
        },
      ],
    },

    {
      slug: "orders",
      iconName: "ListOrdered",
      name: "Orders & order types",
      group: "Service",
      blurb: "Dine-in, takeaway, delivery and room-charge orders in one list.",
      blocks: [
        {
          kind: "table",
          title: "Open orders",
          columns: ["Order", "Type", "Table / destination", "Waiter", "Total", "Status"],
          numericColumns: [4],
          statusColumn: 5,
          rows: [
            ["ORD-4412", "Dine-in", "T7", "Mwape C.", "K 3,410", "In kitchen"],
            ["ORD-4413", "Dine-in", "T2", "Mwape C.", "K 1,240", "Served"],
            ["ORD-4414", "Takeaway", "Counter", "Chileshe M.", "K 420", "Ready"],
            ["ORD-4415", "Delivery", "Kabulonga", "Call centre", "K 680", "Dispatched"],
            ["ORD-4416", "Room charge", "Hotel room 312", "Mwape C.", "K 480", "Posted to folio"],
            ["ORD-4417", "Dine-in", "T12", "Bwalya N.", "K 260", "Open 96 min"],
          ],
        },
      ],
    },

    {
      slug: "courses",
      iconName: "Utensils",
      name: "Courses & pacing",
      group: "Service",
      blurb: "Course-by-course pacing so the kitchen and the floor stay in step.",
      blocks: [
        {
          kind: "board",
          title: "Course board",
          columns: [
            { label: "Held", cards: [{ title: "T7 · Desserts", meta: "Release after mains cleared" }, { title: "T4 · Everything", meta: "Guests not yet seated" }] },
            { label: "Fired", tone: "warn", cards: [{ title: "T7 · Mains x8", meta: "Fired 19:34" }, { title: "T3 · Starters x4", meta: "Fired 19:41" }] },
            { label: "Plating", tone: "info", cards: [{ title: "T2 · Mains x4", meta: "Pass in ~3 min" }] },
            { label: "Served", tone: "good", cards: [{ title: "T7 · Starters", meta: "19:18" }, { title: "T1 · Full order", meta: "19:05" }] },
          ],
        },
      ],
    },

    {
      slug: "table-actions",
      iconName: "Split",
      name: "Split, merge & transfer",
      group: "Service",
      blurb: "The floor actions that keep bills honest — every one logged.",
      blocks: [
        {
          kind: "table",
          title: "Table actions today",
          columns: ["Time", "Action", "From", "To", "Performed by", "Status"],
          statusColumn: 5,
          rows: [
            ["12:40", "Split bill", "T6 · K 1,860", "3 bills", "Kunda P.", "Completed"],
            ["13:15", "Merge tables", "T9 + T10", "T9 (8 covers)", "Mwape C.", "Completed"],
            ["19:20", "Transfer table", "T5", "TR2", "Bwalya N.", "Completed"],
            ["19:44", "Move item", "T7 · 1x Mosi", "T4", "Mwape C.", "Awaiting approval"],
          ],
        },
        {
          kind: "notes",
          title: "Controls",
          lines: [
            "Splitting can be by seat, by item or by an even share; the totals must reconcile before payment.",
            "Moving an item between bills after the kitchen has fired it needs supervisor approval.",
            "Every split, merge and transfer keeps its original order reference for the audit trail.",
          ],
        },
      ],
    },

    {
      slug: "kitchen",
      iconName: "ChefHat",
      name: "Kitchen display",
      group: "Kitchen",
      blurb: "Tickets by station with elapsed time and priority.",
      kpis: [
        { label: "Active tickets", value: "11" },
        { label: "Avg ticket time", value: "14 min", tone: "good" },
        { label: "Late tickets", value: "2", tone: "bad" },
        { label: "Stations", value: "4" },
      ],
      actions: [
        { label: "Start next ticket", variant: "primary" },
        { label: "Mark ready" },
        { label: "Serve" },
      ],
      blocks: [
        {
          kind: "tickets",
          title: "Kitchen display",
          note: "Tickets move left to right. Timers turn amber at 12 minutes and red at 20.",
          lanes: [
            {
              label: "New",
              tone: "info",
              tickets: [
                { ref: "ORD-1184", table: "Table 7", timer: "0:42", priority: "Standard", items: ["2× Beef fillet (med-rare)", "1× Garden salad"], action: "Start" },
                { ref: "ORD-1185", table: "Terrace P1", timer: "0:15", priority: "Standard", items: ["2× Chicken curry", "1× Chips"], action: "Start" },
              ],
            },
            {
              label: "Preparing",
              tone: "warn",
              tickets: [
                { ref: "ORD-1179", table: "Table 10", timer: "11:20", priority: "Large party", items: ["6× Nshima & relish", "3× Grilled chicken"], action: "Mark ready" },
                { ref: "ORD-1181", table: "VIP1", timer: "8:05", priority: "Set menu", items: ["10× Course 2 — beef"], action: "Mark ready" },
              ],
            },
            {
              label: "Ready",
              tone: "good",
              tickets: [
                { ref: "ORD-1176", table: "Table 4", timer: "1:10", priority: "Pass", items: ["2× Malva pudding"], action: "Serve" },
              ],
            },
            {
              label: "Served",
              tone: "neutral",
              tickets: [
                { ref: "ORD-1170", table: "Table 1", timer: "19:44", items: ["4× Starters", "4× Grills"] },
              ],
            },
          ],
        },
        {
          kind: "board",
          title: "Station load — by kitchen section",
          columns: [
            { label: "Grill", tone: "warn", cards: [{ title: "T7 · 3x Beef stir fry", meta: "8 min elapsed", badge: "Fired" }, { title: "T3 · 1x Beef stir fry", meta: "2 min elapsed" }] },
            { label: "Hot kitchen", tone: "info", cards: [{ title: "T7 · 2x Chicken curry", meta: "8 min elapsed" }, { title: "T12 · 1x Nshima", meta: "19 min elapsed", badge: "Late" }] },
            { label: "Cold / salads", tone: "good", cards: [{ title: "T3 · 4x Caesar salad", meta: "3 min elapsed" }] },
            { label: "Pastry", cards: [{ title: "T2 · 2x Fondant", meta: "Held until mains cleared" }] },
          ],
        },
        {
          kind: "table",
          title: "Kitchen stations",
          columns: ["Station", "Chef", "Open tickets", "Avg time", "Longest", "Status"],
          numericColumns: [2],
          statusColumn: 5,
          rows: [
            ["Grill", "Head chef", 4, "16 min", "22 min", "Busy"],
            ["Hot kitchen", "Sous chef", 4, "13 min", "19 min", "Busy"],
            ["Cold / salads", "Commis", 2, "6 min", "8 min", "Normal"],
            ["Pastry", "Pastry chef", 1, "9 min", "9 min", "Normal"],
          ],
        },
      ],
    },

    {
      slug: "menu",
      iconName: "BookOpen",
      name: "Menu & modifiers",
      group: "Menu",
      blurb: "The sellable menu with prices, modifiers and availability.",
      actions: [
        { label: "Add menu item", variant: "primary" },
        { label: "Edit category" },
        { label: "86 an item", section: "availability" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Menu items",
          columns: ["Item", "Category", "Price", "Recipe cost", "Margin", "Status"],
          numericColumns: [2, 3],
          statusColumn: 5,
          rows: [
            ["Grilled tilapia", "Mains", "K 210", "K 84", "60%", "86'd"],
            ["Beef stir fry", "Mains", "K 185", "K 71", "62%", "Available"],
            ["Chicken curry", "Mains", "K 165", "K 58", "65%", "Available"],
            ["Nshima & relish", "Mains", "K 95", "K 26", "73%", "Available"],
            ["Caesar salad", "Starters", "K 85", "K 31", "64%", "Available"],
            ["Chocolate fondant", "Desserts", "K 75", "K 22", "71%", "Available"],
            ["Mosi lager", "Drinks", "K 35", "K 18", "49%", "Available"],
            ["Fresh juice", "Drinks", "K 40", "K 12", "70%", "Available"],
          ],
        },
        {
          kind: "table",
          title: "Modifier groups",
          columns: ["Group", "Applies to", "Choices", "Rule", "Price impact"],
          numericColumns: [2],
          rows: [
            ["Cooking level", "Beef stir fry", 3, "Choose one", "K 0"],
            ["Side choice", "All mains", 5, "Choose one", "K 0 – K 25"],
            ["Extras", "All mains", 6, "Choose any", "K 15 – K 45"],
            ["Spice level", "Chicken curry", 3, "Choose one", "K 0"],
          ],
        },
      ],
    },

    {
      slug: "availability",
      iconName: "CircleSlash",
      name: "Availability & 86 list",
      group: "Menu",
      blurb: "Items pulled from sale, with the reason and who pulled them.",
      blocks: [
        {
          kind: "table",
          title: "86 list",
          columns: ["Item", "Reason", "Pulled by", "Time", "Portions left", "Status"],
          numericColumns: [4],
          statusColumn: 5,
          rows: [
            ["Grilled tilapia", "Stock exhausted", "Kitchen — Head chef", "19:05", 0, "86'd"],
            ["Chocolate fondant", "Low count", "Kitchen — Pastry", "18:40", 4, "Low"],
            ["Fresh juice — mango", "Supplier short delivery", "Bar", "12:10", 0, "86'd"],
          ],
        },
        {
          kind: "notes",
          title: "How it works",
          lines: [
            "86'ing an item immediately blocks it on every till and the online order screen.",
            "The floor sees a strike-through and a suggested alternative dish.",
            "Everything is logged, so the daily report shows lost-sale opportunities.",
          ],
        },
      ],
    },

    {
      slug: "guests",
      iconName: "Users",
      name: "Customers & loyalty",
      group: "Customers",
      blurb: "Regulars, spend history and loyalty balances.",
      actions: [
        { label: "Select existing guest", variant: "primary" },
        { label: "New guest" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Guest records",
          columns: ["Guest", "Visits", "Average spend", "Lifetime", "Loyalty points", "Tier"],
          numericColumns: [1, 2, 3, 4],
          rows: [
            ["N. Chanda", 34, "K 410", "K 13,940", 1394, "Gold"],
            ["L. Phiri", 21, "K 380", "K 7,980", 798, "Silver"],
            ["Copperbelt Tours", 12, "K 3,200", "K 38,400", 3840, "Corporate"],
            ["M. Banda", 8, "K 260", "K 2,080", 208, "Bronze"],
          ],
        },
      ],
    },

    {
      slug: "inventory",
      iconName: "Boxes",
      name: "Ingredients & stock",
      group: "Inventory",
      blurb: "What is in the store room, the cold room and behind the bar.",
      kpis: [
        { label: "Tracked ingredients", value: "186" },
        { label: "Stock value", value: "K 214,800" },
        { label: "Below reorder", value: "7", tone: "warn" },
        { label: "Expiring in 7 days", value: "3", tone: "bad" },
      ],
      actions: [
        { label: "Stock count", variant: "primary" },
        { label: "Transfer to bar" },
        { label: "Record wastage", section: "wastage" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Store room balances",
          columns: ["Ingredient", "Location", "On hand", "Reorder at", "Unit cost", "Value", "Status"],
          numericColumns: [2, 3, 4, 5],
          statusColumn: 6,
          rows: [
            ["Beef fillet", "Cold room", "18.4 kg", "15 kg", "K 185", "K 3,404", "Good"],
            ["Tilapia whole", "Cold room", "0 kg", "10 kg", "K 96", "K 0", "Out"],
            ["Chicken breast", "Cold room", "42.0 kg", "20 kg", "K 78", "K 3,276", "Good"],
            ["Maize meal", "Dry store", "120 kg", "60 kg", "K 22", "K 2,640", "Good"],
            ["Cooking oil", "Dry store", "34 L", "40 L", "K 41", "K 1,394", "Low"],
            ["Mosi lager", "Bar", "168 btl", "120 btl", "K 21", "K 3,528", "Good"],
          ],
        },
        {
          kind: "chart",
          variant: "bars",
          title: "Stock value by location",
          unit: "K ",
          series: [
            { label: "Cold room", value: 94200 },
            { label: "Dry store", value: 68400 },
            { label: "Bar", value: 41300 },
            { label: "Kitchen line", value: 10900, tone: "warn" },
          ],
        },
        {
          kind: "notes",
          title: "How this connects",
          lines: [
            "Every plate sold pulls its recipe quantities out of these balances.",
            "Purchase deliveries push value back in at the cost you actually paid.",
            "Wastage is recorded separately so it never hides inside cost of sales.",
          ],
        },
      ],
    },

    {
      slug: "recipes",
      iconName: "Scale",
      name: "Recipes & costing",
      group: "Inventory",
      blurb: "What each dish consumes, what it costs and what it earns.",
      actions: [
        { label: "Recost recipe", variant: "primary" },
        { label: "Link ingredient" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Recipe — Beef stir fry (1 portion)",
          columns: ["Ingredient", "Quantity", "Unit", "Unit cost", "Line cost"],
          numericColumns: [1, 3, 4],
          rows: [
            ["Beef strips", 180, "g", "K 0.22/g", "K 39.60"],
            ["Mixed vegetables", 120, "g", "K 0.09/g", "K 10.80"],
            ["Rice", 150, "g", "K 0.05/g", "K 7.50"],
            ["Cooking oil", 20, "ml", "K 0.06/ml", "K 1.20"],
            ["Sauce & seasoning", 1, "portion", "K 11.90", "K 11.90"],
          ],
        },
        {
          kind: "panel",
          title: "Dish economics",
          items: [
            { label: "Total recipe cost", value: "K 71.00" },
            { label: "Menu price (excl VAT)", value: "K 185.00" },
            { label: "Gross profit", value: "K 114.00", tone: "good" },
            { label: "Margin", value: "62%", tone: "good" },
            { label: "Sold today", value: "31 portions" },
            { label: "Stock consumed", value: "5.58 kg beef · 3.72 kg vegetables" },
          ],
        },
      ],
    },

    {
      slug: "wastage",
      iconName: "Trash2",
      name: "Wastage & transfers",
      group: "Inventory",
      blurb: "Losses recorded with a reason, and movements between kitchen and bar.",
      blocks: [
        {
          kind: "table",
          title: "Wastage log",
          columns: ["Date", "Item", "Quantity", "Reason", "Cost", "Recorded by"],
          numericColumns: [2, 4],
          rows: [
            ["11 Sep", "Tilapia fillet", "2.4 kg", "Spoilage — chiller fault", "K 288", "Head chef"],
            ["11 Sep", "Salad leaves", "1.1 kg", "Expired", "K 62", "Commis"],
            ["12 Sep", "Beef strips", "0.6 kg", "Preparation error", "K 132", "Sous chef"],
            ["12 Sep", "Draught beer", "3.0 L", "Line cleaning", "K 96", "Bar"],
          ],
        },
        {
          kind: "table",
          title: "Stock transfers",
          columns: ["Date", "Item", "Quantity", "From", "To", "Status"],
          numericColumns: [2],
          statusColumn: 5,
          rows: [
            ["11 Sep", "Fresh juice concentrate", "12 L", "Main store", "Bar", "Received"],
            ["12 Sep", "Cooking oil", "20 L", "Main store", "Kitchen", "Received"],
            ["12 Sep", "Mosi lager", "6 crates", "Main store", "Terrace bar", "In transit"],
          ],
        },
      ],
    },

    {
      slug: "purchasing",
      iconName: "Truck",
      name: "Purchasing",
      group: "Inventory",
      blurb: "Orders, deliveries and supplier bills feeding food cost.",
      kpis: [
        { label: "Food cost ratio", value: "31%", tone: "good" },
        { label: "Open orders", value: "6" },
        { label: "Bills pending", value: "3", tone: "warn" },
        { label: "Suppliers", value: "14" },
      ],
      actions: [
        { label: "New purchase order", variant: "primary" },
        { label: "Receive delivery" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Purchase activity",
          columns: ["Doc", "Supplier", "Items", "Value", "Delivery", "Status"],
          numericColumns: [2, 3],
          statusColumn: 5,
          rows: [
            ["PO-880", "Lusaka Fresh Produce", 18, "K 14,200", "13 Sep", "Ordered"],
            ["PO-881", "Copper Meats Ltd", 6, "K 22,600", "13 Sep", "Ordered"],
            ["GRN-402", "Zambian Breweries", 9, "K 18,400", "11 Sep", "Received"],
            ["BILL-991", "Zambian Breweries", 9, "K 18,400", "—", "Approved"],
            ["BILL-992", "Copper Meats Ltd", 5, "K 19,800", "—", "Pending"],
          ],
        },
      ],
    },

    {
      slug: "suppliers",
      iconName: "Building2",
      name: "Suppliers",
      group: "Inventory",
      blurb: "Who you buy from, on what terms, and what you still owe them.",
      kpis: [
        { label: "Active suppliers", value: "24" },
        { label: "Owing", value: "K 96,400", tone: "warn" },
        { label: "Overdue", value: "K 12,300", tone: "bad" },
        { label: "On-time delivery", value: "92%", tone: "good" },
      ],
      actions: [
        { label: "Select existing supplier", variant: "primary" },
        { label: "New supplier" },
        { label: "Pay supplier", section: "accounting" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Supplier list",
          note: "Choose an existing supplier first — creating one is the secondary action.",
          columns: ["Supplier", "Category", "Terms", "Open bills", "Balance", "Status"],
          numericColumns: [3, 4],
          statusColumn: 5,
          rows: [
            ["Lusaka Fresh Produce", "Vegetables", "14 days", 3, "K 18,400", "Current"],
            ["Copperbelt Meats", "Meat & fish", "30 days", 2, "K 41,900", "Current"],
            ["Zambezi Beverages", "Drinks", "7 days", 1, "K 12,300", "Overdue"],
            ["Kafue Dry Goods", "Dry store", "30 days", 4, "K 23,800", "Current"],
          ],
        },
        {
          kind: "panel",
          title: "Copperbelt Meats — supplier detail",
          items: [
            { label: "Contact", value: "Grace Mulenga · +260 97 000 0000" },
            { label: "Payment terms", value: "30 days from invoice" },
            { label: "Bills this month", value: "6" },
            { label: "Average delivery", value: "1.4 days" },
            { label: "Outstanding", value: "K 41,900", tone: "warn" },
            { label: "Last payment", value: "K 30,000 · 12 days ago", tone: "good" },
          ],
        },
      ],
    },

    {
      slug: "discounts",
      iconName: "Percent",
      name: "Discounts, service charge & VAT",
      group: "Money",
      blurb: "Price adjustments with approval rules and the tax treatment behind them.",
      blocks: [
        {
          kind: "table",
          title: "Adjustment rules",
          columns: ["Rule", "Value", "Applies to", "Approval", "Used today", "Status"],
          numericColumns: [4],
          statusColumn: 5,
          rows: [
            ["Staff meal", "50%", "Food only", "Supervisor", 6, "Active"],
            ["Loyalty Gold", "10%", "Whole bill", "Automatic", 4, "Active"],
            ["Manager discretion", "Up to 25%", "Whole bill", "Manager + reason", 2, "Review"],
            ["Service charge", "10%", "Dine-in, 6+ covers", "Automatic", 9, "Active"],
            ["VAT", "16%", "All taxable sales", "Statutory", 214, "Active"],
          ],
        },
      ],
    },

    {
      slug: "payments",
      iconName: "CreditCard",
      name: "Payments & receipts",
      group: "Money",
      blurb: "Multiple tenders on one bill, with the receipt that follows.",
      actions: [
        { label: "Take payment", variant: "primary" },
        { label: "Split payment", section: "table-actions" },
        { label: "Reprint receipt" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Bill 4413 — Table 2",
          columns: ["Line", "Detail", "Amount", "Status"],
          numericColumns: [2],
          statusColumn: 3,
          rows: [
            ["Food & drink", "9 lines", "K 1,240", "Confirmed"],
            ["Service charge 10%", "Auto-applied", "K 124", "Confirmed"],
            ["VAT 16%", "On taxable lines", "K 218", "Confirmed"],
            ["Total due", "—", "K 1,582", "Confirmed"],
            ["Payment 1 — Card", "Visa ****4419", "K 1,000", "Approved"],
            ["Payment 2 — Mobile money", "Airtel", "K 582", "Approved"],
          ],
        },
        {
          kind: "panel",
          title: "Tender mix today",
          items: [
            { label: "Card", value: "K 31,420 · 46%" },
            { label: "Mobile money", value: "K 22,180 · 32%" },
            { label: "Cash", value: "K 12,340 · 18%" },
            { label: "Room charge", value: "K 2,480 · 4%" },
          ],
        },
      ],
    },

    {
      slug: "shifts",
      iconName: "Wallet",
      name: "Cashier & cash-up",
      group: "Money",
      blurb: "Drawer counts, variances and the sign-off that closes a shift.",
      actions: [
        { label: "Close shift", variant: "primary" },
        { label: "Cash drop" },
        { label: "Print Z-read" },
      ],
      blocks: [
        {
          kind: "panel",
          title: "Open shift — Chanda M. (Till 1)",
          note: "Opened 11:58 · sample figures only.",
          items: [
            { label: "Opening float", value: "K 1,500" },
            { label: "Cash sales", value: "K 14,300", tone: "good" },
            { label: "Card sales", value: "K 21,980" },
            { label: "Mobile money", value: "K 28,640" },
            { label: "Payouts", value: "K 620", tone: "warn" },
            { label: "Cash expected", value: "K 15,180" },
            { label: "Cash counted", value: "K 15,120" },
            { label: "Variance", value: "-K 60", tone: "warn" },
          ],
        },
        {
          kind: "table",
          title: "Shift cash-up",
          columns: ["Shift", "Cashier", "Opening float", "Expected cash", "Counted", "Variance"],
          numericColumns: [2, 3, 4, 5],
          rows: [
            ["Breakfast", "Chileshe M.", "K 500", "K 2,180", "K 2,180", "K 0"],
            ["Lunch", "Kunda P.", "K 500", "K 5,940", "K 5,900", "-K 40"],
            ["Dinner (open)", "Mwape C.", "K 500", "K 4,220", "—", "—"],
          ],
        },
        {
          kind: "notes",
          title: "Close-out rules",
          lines: [
            "A variance over K 50 blocks the close and raises an approval request.",
            "A cashier cannot reopen a closed shift; only a manager can, and the reason is recorded.",
            "The closed shift becomes one summarised journal, not hundreds of loose entries.",
          ],
        },
      ],
    },

    {
      slug: "expenses",
      iconName: "Receipt",
      name: "Expenses",
      group: "Money",
      blurb: "Day-to-day running costs paid straight from cash or bank.",
      kpis: [
        { label: "This month", value: "K 84,200" },
        { label: "Cash paid", value: "K 21,600" },
        { label: "Bank paid", value: "K 62,600" },
        { label: "Awaiting approval", value: "4", tone: "warn" },
      ],
      actions: [
        { label: "Record expense", variant: "primary" },
        { label: "Attach receipt" },
        { label: "See supplier bills", section: "purchasing" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Recent expenses",
          columns: ["Date", "Description", "Expense account", "Paid from", "Payee", "Amount", "Status"],
          numericColumns: [5],
          statusColumn: 6,
          rows: [
            ["12 Mar", "Gas cylinders refill", "Kitchen fuel", "Till float", "Zed Gas", "K 1,850", "Posted"],
            ["12 Mar", "Waste collection", "Cleaning", "Bank — ZNCB current", "City Council", "K 2,400", "Posted"],
            ["11 Mar", "Cleaning chemicals", "Cleaning", "Petty cash", "Kafue Dry Goods", "K 760", "Posted"],
            ["11 Mar", "Generator diesel", "Utilities", "Till float", "Puma Filling", "K 3,200", "Pending approval"],
            ["10 Mar", "Menu reprint", "Marketing", "Bank — ZNCB current", "Print Hub", "K 1,150", "Posted"],
          ],
        },
        {
          kind: "notes",
          title: "Expense, bill or payment?",
          lines: [
            "Expense — you paid immediately from cash or bank, e.g. diesel for the generator.",
            "Supplier bill — the supplier delivered on credit and you owe them.",
            "Supplier payment — you are settling one or more of those bills later.",
          ],
        },
      ],
    },

    {
      slug: "accounting",
      iconName: "Landmark",
      name: "Accounting impact",
      group: "Controls",
      blurb: "How a day of service lands in the accounts — preview only.",
      blocks: [
        {
          kind: "table",
          title: "Daily trading summary",
          columns: ["Line", "Today", "Month to date", "% of sales"],
          numericColumns: [1, 2],
          rows: [
            ["Sales (excl VAT)", "K 58,983", "K 742,180", "100%"],
            ["Cost of sales", "K 18,285", "K 231,760", "31%"],
            ["Gross profit", "K 40,698", "K 510,420", "69%"],
            ["Wages", "K 12,400", "K 158,900", "21%"],
            ["Other operating costs", "K 9,120", "K 121,340", "16%"],
            ["Operating profit", "K 19,178", "K 230,180", "32%"],
          ],
        },
        {
          kind: "panel",
          title: "Posting preview",
          items: [
            { label: "Sales journal", value: "Debits K 68,420 · Credits K 68,420", tone: "good" },
            { label: "Stock consumption", value: "K 18,285 from recipe consumption" },
            { label: "Wastage write-off", value: "K 578 to expense" },
            { label: "Posting state", value: "Preview only (demo)", tone: "info" },
          ],
        },
      ],
    },

    {
      slug: "approvals",
      iconName: "ShieldCheck",
      name: "Approvals & audit trail",
      group: "Controls",
      blurb: "Voids, comps, reprints and overrides — who asked, who approved.",
      blocks: [
        {
          kind: "table",
          title: "Audit log",
          columns: ["Time", "Event", "Detail", "Requested by", "Approved by", "Status"],
          statusColumn: 5,
          rows: [
            ["12:52", "Void line", "1x Caesar salad · wrong order", "Kunda P.", "Duty manager", "Approved"],
            ["14:10", "Comp", "1x Dessert · service recovery", "Mwape C.", "Duty manager", "Approved"],
            ["18:22", "Receipt reprint", "Bill 4402", "Chileshe M.", "—", "Logged"],
            ["19:44", "Move item", "T7 → T4", "Mwape C.", "—", "Pending"],
            ["19:58", "Discount 25%", "Bill 4411 · manager discretion", "Bwalya N.", "Duty manager", "Pending review"],
          ],
        },
      ],
    },

    {
      slug: "reports",
      iconName: "BarChart3",
      name: "Reports",
      group: "Analysis",
      blurb: "What sold, what it cost and where the time went.",
      blocks: [
        {
          kind: "chart",
          variant: "bars",
          title: "Top items by revenue this week",
          unit: "K ",
          series: [
            { label: "Beef fillet", value: 38400, tone: "good" },
            { label: "Chicken curry", value: 27600 },
            { label: "Nshima & relish", value: 21100 },
            { label: "Mosi lager", value: 18700 },
            { label: "Malva pudding", value: 9200, tone: "warn" },
          ],
        },
        {
          kind: "table",
          title: "Top selling items today",
          columns: ["Item", "Sold", "Sales", "Cost", "Gross profit", "Margin"],
          numericColumns: [1, 2, 3, 4],
          rows: [
            ["Nshima & relish", 48, "K 4,560", "K 1,248", "K 3,312", "73%"],
            ["Beef stir fry", 31, "K 5,735", "K 2,201", "K 3,534", "62%"],
            ["Chicken curry", 29, "K 4,785", "K 1,682", "K 3,103", "65%"],
            ["Mosi lager", 96, "K 3,360", "K 1,728", "K 1,632", "49%"],
            ["Caesar salad", 24, "K 2,040", "K 744", "K 1,296", "64%"],
          ],
        },
        {
          kind: "table",
          title: "Kitchen performance",
          columns: ["Station", "Tickets", "Avg time", "Over 20 min", "On-time rate"],
          numericColumns: [1, 3],
          rows: [
            ["Grill", 62, "16 min", 7, "89%"],
            ["Hot kitchen", 78, "13 min", 4, "95%"],
            ["Cold / salads", 44, "6 min", 0, "100%"],
            ["Pastry", 31, "9 min", 1, "97%"],
          ],
        },
      ],
    },

    {
      slug: "smart-reporter",
      iconName: "Sparkles",
      name: "Smart Reporter",
      group: "Analysis",
      blurb: "Plain-language observations drawn from the same figures.",
      blocks: [
        {
          kind: "notes",
          title: "What the numbers are saying",
          lines: [
            "Dinner average spend (K 417) is 40% higher than lunch — the set menu is doing the work.",
            "Beer margin (49%) is well below the food average; a price review would add roughly K 620 a day.",
            "Grill is the bottleneck: 7 tickets over 20 minutes, all during the 19:15–19:45 peak.",
            "Wastage is K 578 today, mostly one chiller fault — worth a maintenance job before it repeats.",
            "Grilled tilapia sold out by 19:05; three tables asked for it after that, an estimated K 630 of lost sales.",
          ],
        },
        {
          kind: "table",
          title: "Suggested next actions",
          columns: ["Action", "Why", "Impact", "Owner"],
          rows: [
            ["Review draught beer pricing", "Margin 14 points below target", "~K 620/day", "Manager"],
            ["Add a second grill hand at 19:00", "Peak ticket times exceed 20 min", "Faster turns", "Head chef"],
            ["Raise tilapia par level", "Sold out before peak", "~K 630/day", "Purchasing"],
            ["Log chiller repair", "Spoilage of K 288 in one day", "Avoids repeat loss", "Maintenance"],
          ],
        },
      ],
    },

    {
      slug: "settings",
      iconName: "Settings",
      name: "Settings",
      group: "Settings",
      blurb: "How this restaurant is configured — areas, taxes, printers and roles.",
      actions: [{ label: "Edit settings", variant: "primary" }],
      blocks: [
        {
          kind: "panel",
          title: "Service configuration",
          items: [
            { label: "Dining areas", value: "Main dining, Terrace, Private room" },
            { label: "Service charge", value: "10% on dine-in" },
            { label: "VAT", value: "16% inclusive" },
            { label: "Order types", value: "Dine-in, Takeaway, Delivery, Room charge" },
            { label: "Rounding", value: "Nearest K 1 on cash" },
            { label: "Currency", value: "ZMW (K)" },
          ],
        },
        {
          kind: "grid",
          title: "Printers & devices",
          cells: [
            { label: "Kitchen printer", sub: "Hot line · online", tone: "good", badge: "Online" },
            { label: "Bar printer", sub: "Drinks tickets", tone: "good", badge: "Online" },
            { label: "Till 1 receipt", sub: "Front cashier", tone: "good", badge: "Online" },
            { label: "Till 2 receipt", sub: "Terrace", tone: "warn", badge: "Paper low" },
          ],
        },
        {
          kind: "table",
          title: "Roles & permissions",
          columns: ["Role", "Take orders", "Discount", "Void", "Cash-up", "Reports"],
          rows: [
            ["Waiter", "Yes", "No", "No", "No", "No"],
            ["Cashier", "Yes", "Up to 5%", "With PIN", "Yes", "Own shift"],
            ["Supervisor", "Yes", "Up to 15%", "Yes", "Yes", "Daily"],
            ["Manager", "Yes", "Any", "Yes", "Yes", "All"],
          ],
        },
      ],
    },
  ],
};
