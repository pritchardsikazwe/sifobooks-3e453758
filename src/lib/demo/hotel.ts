import type { DemoIndustry } from "./types";

/** SAMPLE DATA ONLY — see src/lib/demo/types.ts for the safety contract. */
export const hotelDemo: DemoIndustry = {
  slug: "hotel",
  name: "Hotel",
  product: "SifoHotel",
  tagline: "Front desk, housekeeping, folios and night audit in one connected property system.",
  description:
    "Walk a full property day: reservations arrive, guests check in, charges land on the folio, housekeeping turns rooms over, and the night audit closes the day into accounting.",
  highlights: ["48-room sample property", "Folios & room charges", "Night audit to ledger", "Occupancy, ADR & RevPAR"],
  accent: {
    gradient: "from-indigo-500/15 via-sky-500/10 to-background",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/30",
  },
  sections: [
    {
      slug: "dashboard",
      iconName: "LayoutDashboard",
      name: "Dashboard",
      group: "Overview",
      blurb: "Today's property position at a glance.",
      kpis: [
        { label: "Occupancy", value: "78%", hint: "37 of 48 rooms sold", tone: "good" },
        { label: "ADR", value: "K 1,240", hint: "Average daily rate", tone: "info" },
        { label: "RevPAR", value: "K 967", hint: "Revenue per available room", tone: "info" },
        { label: "Arrivals today", value: "14", hint: "6 already checked in" },
        { label: "Departures today", value: "11", hint: "3 pending settlement", tone: "warn" },
        { label: "Rooms revenue MTD", value: "K 842,600", tone: "good" },
      ],
      actions: [
        { label: "Check in arrival", variant: "primary", section: "front-desk" },
        { label: "New reservation", section: "reservations" },
        { label: "Room status", section: "rooms" },
      ],
      blocks: [
        {
          kind: "chart",
          variant: "line",
          title: "Occupancy — last 7 nights",
          note: "Sample figures. Weekend conference lifted mid-week occupancy.",
          unit: "%",
          series: [
            { label: "Mon", value: 62 },
            { label: "Tue", value: 68 },
            { label: "Wed", value: 74 },
            { label: "Thu", value: 81 },
            { label: "Fri", value: 92 },
            { label: "Sat", value: 96 },
            { label: "Sun", value: 78 },
          ],
        },
        {
          kind: "chart",
          variant: "donut",
          title: "Revenue mix today",
          unit: "K ",
          series: [
            { label: "Rooms", value: 148200 },
            { label: "Restaurant", value: 42600 },
            { label: "Bar", value: 18400 },
            { label: "Conference", value: 26000 },
          ],
        },
        {
          kind: "grid",
          title: "Room status right now",
          cells: [
            { label: "Occupied 68", sub: "of 96 rooms", tone: "info" },
            { label: "Available 14", sub: "clean & inspected", tone: "good" },
            { label: "Dirty 9", sub: "awaiting housekeeping", tone: "warn" },
            { label: "Out of order 5", sub: "maintenance", tone: "bad" },
          ],
        },
        {
          kind: "panel",
          title: "Front desk position",
          items: [
            { label: "In house", value: "37 rooms · 62 guests" },
            { label: "Due out", value: "11 rooms", tone: "warn" },
            { label: "Rooms clean & ready", value: "6", tone: "good" },
            { label: "Rooms out of order", value: "1 — Room 214 aircon", tone: "bad" },
            { label: "Open folio balance", value: "K 128,450" },
            { label: "Deposits held", value: "K 46,200" },
          ],
        },
        {
          kind: "table",
          title: "Today's activity",
          columns: ["Time", "Activity", "Room", "Guest", "Amount", "Status"],
          numericColumns: [4],
          statusColumn: 5,
          rows: [
            ["07:12", "Check-out", "108", "M. Banda", "K 3,720", "Settled"],
            ["09:40", "Room charge — breakfast", "312", "L. Phiri", "K 260", "Posted"],
            ["11:05", "Deposit received", "205", "Zambezi Mining Ltd", "K 12,000", "Posted"],
            ["13:30", "Check-in", "417", "C. Mwale", "K 0", "In house"],
            ["16:20", "Bar charge to room", "312", "L. Phiri", "K 480", "Posted"],
            ["18:00", "Check-in", "220", "T. Sakala", "K 0", "In house"],
          ],
        },
      ],
    },

    {
      slug: "front-desk",
      iconName: "ConciergeBell",
      name: "Front desk",
      group: "Front office",
      blurb: "The daily desk worklist: keys, messages, requests and escalations.",
      actions: [
        { label: "Check in", variant: "primary" },
        { label: "Check out", section: "check-in-out" },
        { label: "View folio", section: "folios" },
        { label: "Move room", section: "rooms" },
      ],
      blocks: [
        {
          kind: "flow",
          title: "Today at the desk",
          steps: [
            { label: "Arrivals", detail: "18 expected · 7 checked in", state: "In progress", tone: "warn" },
            { label: "Departures", detail: "14 due · 11 settled", state: "In progress", tone: "info" },
            { label: "In house", detail: "68 rooms occupied", state: "Live", tone: "good" },
            { label: "Folios open", detail: "K 214,600 outstanding", state: "Watch", tone: "warn" },
            { label: "Night audit", detail: "Runs 23:30", state: "Scheduled" },
          ],
        },
        {
          kind: "table",
          title: "Desk worklist",
          columns: ["Time", "Task", "Room", "Assigned to", "Priority", "Status"],
          statusColumn: 5,
          rows: [
            ["08:15", "Airport pickup confirmation", "305", "Front desk", "High", "Open"],
            ["09:00", "Late checkout request", "312", "Duty manager", "Medium", "Approved"],
            ["10:30", "Extra bed to be delivered", "220", "Housekeeping", "Medium", "In progress"],
            ["12:00", "Corporate billing letter", "305", "Accounts", "High", "Open"],
            ["15:45", "Lost property enquiry", "108", "Front desk", "Low", "Closed"],
          ],
        },
      ],
    },

    {
      slug: "reservations",
      iconName: "CalendarDays",
      name: "Reservations",
      group: "Front office",
      blurb: "Booking pipeline with the seven-day arrival calendar.",
      kpis: [
        { label: "Confirmed bookings", value: "63" },
        { label: "Provisional", value: "9", tone: "warn" },
        { label: "Cancellations (30d)", value: "4" },
        { label: "Forward revenue", value: "K 1,120,400", tone: "good" },
      ],
      actions: [
        { label: "New reservation", variant: "primary" },
        { label: "Confirm" },
        { label: "Check in", section: "front-desk" },
        { label: "Cancel", variant: "ghost" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Reservation list",
          columns: ["Ref", "Guest", "Room type", "Arrival", "Nights", "Rate/night", "Status"],
          numericColumns: [4, 5],
          statusColumn: 6,
          rows: [
            ["RES-1042", "C. Mwale", "Deluxe King", "12 Sep", 2, "K 1,350", "Checked in"],
            ["RES-1043", "Zambezi Mining Ltd", "Executive Suite", "12 Sep", 5, "K 2,400", "Confirmed"],
            ["RES-1044", "T. Sakala", "Twin Standard", "12 Sep", 1, "K 980", "Checked in"],
            ["RES-1045", "N. Chanda", "Deluxe King", "13 Sep", 3, "K 1,350", "Confirmed"],
            ["RES-1046", "Copperbelt Tours", "Standard x6", "14 Sep", 2, "K 890", "Provisional"],
            ["RES-1047", "R. Tembo", "Family Room", "15 Sep", 4, "K 1,780", "Confirmed"],
          ],
        },
        {
          kind: "grid",
          title: "Seven-day arrivals calendar",
          note: "Rooms sold against 48 available.",
          cells: [
            { label: "Fri 12", sub: "37 sold · 14 arrivals", tone: "good" },
            { label: "Sat 13", sub: "42 sold · 12 arrivals", tone: "good" },
            { label: "Sun 14", sub: "44 sold · 15 arrivals", tone: "warn", badge: "Near full" },
            { label: "Mon 15", sub: "31 sold · 8 arrivals" },
            { label: "Tue 16", sub: "26 sold · 6 arrivals" },
            { label: "Wed 17", sub: "22 sold · 5 arrivals" },
            { label: "Thu 18", sub: "19 sold · 4 arrivals" },
          ],
        },
      ],
    },

    {
      slug: "availability",
      iconName: "CalendarRange",
      name: "Availability",
      group: "Rooms",
      blurb: "Sellable rooms by type across the week.",
      blocks: [
        {
          kind: "table",
          title: "Availability by type",
          columns: ["Type", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"],
          numericColumns: [1, 2, 3, 4, 5, 6],
          rows: [
            ["Standard Twin", 4, 2, 1, 6, 9, 11],
            ["Deluxe King", 3, 1, 0, 5, 8, 9],
            ["Family Room", 2, 2, 1, 3, 4, 5],
            ["Executive Suite", 1, 1, 1, 2, 3, 3],
            ["Presidential Suite", 1, 0, 1, 2, 2, 2],
          ],
        },
        {
          kind: "notes",
          title: "Yield notes",
          lines: [
            "Sunday is close to sell-out on Deluxe King — consider closing the corporate rate.",
            "Copperbelt Tours provisional block releases Saturday 18:00 if unconfirmed.",
          ],
        },
      ],
    },

    {
      slug: "rooms",
      iconName: "BedDouble",
      name: "Rooms",
      group: "Rooms",
      blurb: "Room inventory, rate plans and current condition.",
      kpis: [
        { label: "Rooms", value: "48" },
        { label: "Room types", value: "5" },
        { label: "Out of order", value: "1", tone: "bad" },
        { label: "Average rate", value: "K 1,318" },
      ],
      actions: [
        { label: "Open room detail", variant: "primary" },
        { label: "Change status" },
        { label: "Block room" },
      ],
      blocks: [
        {
          kind: "map",
          title: "Room status board",
          note: "Each tile is a real demo room — opening one shows its detail, never a create form.",
          legend: [
            { label: "Available", tone: "good" },
            { label: "Occupied", tone: "info" },
            { label: "Reserved / arriving", tone: "warn" },
            { label: "Out of order", tone: "bad" },
          ],
          areas: [
            {
              label: "Floor 1 — Standard",
              cells: [
                { label: "101", state: "Occupied", tone: "info", meta: "Mr Banda · out 14 Mar", amount: "K 3,200" },
                { label: "102", state: "Clean", tone: "good", meta: "Inspected 09:40" },
                { label: "103", state: "Dirty", tone: "warn", meta: "Departed 08:15" },
                { label: "104", state: "Occupied", tone: "info", meta: "Ms Zulu · out 13 Mar", amount: "K 1,150" },
                { label: "105", state: "Arriving", tone: "warn", meta: "Phiri · ETA 15:00" },
                { label: "106", state: "Out of order", tone: "bad", meta: "AC repair" },
                { label: "107", state: "Clean", tone: "good", meta: "Ready" },
                { label: "108", state: "Occupied", tone: "info", meta: "Mr Tembo · out 16 Mar", amount: "K 6,400" },
                { label: "109", state: "Cleaning", tone: "warn", meta: "Grace · started 10:05" },
                { label: "110", state: "Clean", tone: "good", meta: "Ready" },
              ],
            },
            {
              label: "Floor 2 — Executive",
              cells: [
                { label: "201", state: "Occupied", tone: "info", meta: "Conference block", amount: "K 4,800" },
                { label: "202", state: "Occupied", tone: "info", meta: "Conference block", amount: "K 4,800" },
                { label: "203", state: "Dirty", tone: "warn", meta: "Departed 07:50" },
                { label: "204", state: "Clean", tone: "good", meta: "Ready" },
                { label: "205", state: "Arriving", tone: "warn", meta: "Mwale · ETA 18:30" },
              ],
            },
            {
              label: "Floor 3 — Suites",
              cells: [
                { label: "301", state: "Occupied", tone: "info", meta: "Ms Chanda · out 15 Mar", amount: "K 11,400" },
                { label: "302", state: "Clean", tone: "good", meta: "Ready" },
                { label: "303", state: "Out of order", tone: "bad", meta: "Refurbishment" },
              ],
            },
          ],
        },
        {
          kind: "table",
          title: "Room types & rate plans",
          columns: ["Type", "Rooms", "Max guests", "Rack rate", "Corporate rate", "Status"],
          numericColumns: [1, 2, 3, 4],
          statusColumn: 5,
          rows: [
            ["Standard Twin", 16, 2, "K 980", "K 850", "Selling"],
            ["Deluxe King", 14, 2, "K 1,350", "K 1,180", "Selling"],
            ["Family Room", 8, 4, "K 1,780", "K 1,560", "Selling"],
            ["Executive Suite", 6, 3, "K 2,400", "K 2,100", "Selling"],
            ["Presidential Suite", 4, 4, "K 4,200", "K 3,800", "On request"],
          ],
        },
        {
          kind: "grid",
          title: "Room rack — floor 2",
          cells: [
            { label: "201", sub: "Deluxe · In house", tone: "info" },
            { label: "202", sub: "Deluxe · Vacant clean", tone: "good" },
            { label: "203", sub: "Twin · Due out", tone: "warn" },
            { label: "204", sub: "Twin · In house", tone: "info" },
            { label: "205", sub: "Suite · In house", tone: "info" },
            { label: "206", sub: "Twin · Vacant dirty", tone: "warn" },
            { label: "214", sub: "Twin · Out of order", tone: "bad", badge: "Aircon" },
            { label: "220", sub: "Family · Arriving", tone: "good" },
          ],
        },
      ],
    },

    {
      slug: "guests",
      iconName: "Users",
      name: "Guests",
      group: "Front office",
      blurb: "Guest profiles, stay history and preferences.",
      kpis: [
        { label: "Guest profiles", value: "1,284" },
        { label: "Repeat guests", value: "36%", tone: "good" },
        { label: "Corporate accounts", value: "18" },
        { label: "Loyalty members", value: "212" },
      ],
      actions: [
        { label: "Select existing guest", variant: "primary" },
        { label: "New guest" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Guest directory",
          columns: ["Guest", "Type", "Phone", "Stays", "Lifetime value", "Status"],
          numericColumns: [3, 4],
          statusColumn: 5,
          rows: [
            ["L. Phiri", "Individual", "+260 97 000 0001", 12, "K 84,200", "In house"],
            ["Zambezi Mining Ltd", "Corporate", "+260 21 000 0002", 41, "K 612,900", "Confirmed"],
            ["C. Mwale", "Individual", "+260 96 000 0003", 3, "K 9,400", "In house"],
            ["Copperbelt Tours", "Agent", "+260 21 000 0004", 27, "K 288,100", "Provisional"],
            ["N. Chanda", "Loyalty — Gold", "+260 95 000 0005", 8, "K 41,300", "Confirmed"],
          ],
        },
        {
          kind: "notes",
          title: "Preferences on file",
          lines: [
            "L. Phiri — high floor, late checkout, no dairy at breakfast.",
            "Zambezi Mining Ltd — direct billing to company account, monthly statement.",
            "N. Chanda — quiet wing, twin beds, airport pickup usually required.",
          ],
        },
      ],
    },

    {
      slug: "check-in-out",
      iconName: "LogIn",
      name: "Check-in / check-out",
      group: "Front office",
      blurb: "Arrivals, in-house guests and departures awaiting settlement.",
      blocks: [
        {
          kind: "board",
          title: "Arrivals & departures board",
          columns: [
            {
              label: "Expected arrivals",
              tone: "info",
              cards: [
                { title: "RES-1043 · Zambezi Mining Ltd", meta: "Executive Suite 305 · 5 nights", badge: "Deposit paid" },
                { title: "RES-1046 · Copperbelt Tours", meta: "6 x Standard · awaiting confirmation", badge: "Provisional" },
              ],
            },
            {
              label: "Checked in",
              tone: "good",
              cards: [
                { title: "Room 417 · C. Mwale", meta: "2 nights · folio K 2,700" },
                { title: "Room 220 · T. Sakala", meta: "1 night · folio K 980" },
                { title: "Room 312 · L. Phiri", meta: "3 nights · folio K 4,790" },
              ],
            },
            {
              label: "Due out",
              tone: "warn",
              cards: [
                { title: "Room 108 · M. Banda", meta: "Settled · awaiting key return" },
                { title: "Room 203 · P. Zulu", meta: "Balance K 1,340 outstanding", badge: "Collect" },
              ],
            },
          ],
        },
      ],
    },

    {
      slug: "housekeeping",
      iconName: "Sparkles",
      name: "Housekeeping",
      group: "Operations",
      blurb: "Room status board and attendant assignments.",
      kpis: [
        { label: "Vacant clean", value: "6", tone: "good" },
        { label: "Vacant dirty", value: "5", tone: "warn" },
        { label: "Occupied clean", value: "29" },
        { label: "Out of order", value: "1", tone: "bad" },
      ],
      actions: [
        { label: "Assign rooms", variant: "primary" },
        { label: "Start cleaning" },
        { label: "Mark clean" },
        { label: "Inspect" },
      ],
      blocks: [
        {
          kind: "tickets",
          title: "Housekeeping board",
          note: "Assign, start, finish and inspect — the same states the room board reads from.",
          lanes: [
            {
              label: "To assign",
              tone: "bad",
              tickets: [
                { ref: "HK-311", table: "Room 103", priority: "Departure clean", items: ["Full strip", "Bathroom deep clean"], action: "Assign" },
                { ref: "HK-312", table: "Room 203", priority: "Departure clean", items: ["Full strip", "Restock minibar"], action: "Assign" },
              ],
            },
            {
              label: "Cleaning",
              tone: "warn",
              tickets: [
                { ref: "HK-308", table: "Room 109", timer: "22 min", priority: "Grace M.", items: ["Stayover refresh"], action: "Mark clean" },
              ],
            },
            {
              label: "To inspect",
              tone: "info",
              tickets: [
                { ref: "HK-305", table: "Room 204", timer: "6 min", priority: "Supervisor", items: ["Ready for inspection"], action: "Inspect" },
              ],
            },
            {
              label: "Inspected",
              tone: "good",
              tickets: [
                { ref: "HK-301", table: "Room 102", items: ["Passed 09:40"] },
                { ref: "HK-302", table: "Room 107", items: ["Passed 10:12"] },
              ],
            },
          ],
        },
        {
          kind: "board",
          title: "Room status board",
          columns: [
            { label: "Vacant clean", tone: "good", cards: [{ title: "202, 310, 402", meta: "Inspected & released" }, { title: "418", meta: "Ready for VIP arrival" }] },
            { label: "Vacant dirty", tone: "warn", cards: [{ title: "206, 217", meta: "Assigned to Grace M." }, { title: "108, 203", meta: "Departure clean pending" }] },
            { label: "In progress", tone: "info", cards: [{ title: "311", meta: "Deep clean · Joseph K." }, { title: "220", meta: "Extra bed setup" }] },
            { label: "Blocked", tone: "bad", cards: [{ title: "214", meta: "Aircon repair · maintenance job MNT-88", badge: "Out of order" }] },
          ],
        },
        {
          kind: "table",
          title: "Attendant productivity (today)",
          columns: ["Attendant", "Assigned", "Completed", "Avg minutes/room", "Status"],
          numericColumns: [1, 2, 3],
          statusColumn: 4,
          rows: [
            ["Grace M.", 12, 9, 26, "On shift"],
            ["Joseph K.", 11, 7, 31, "On shift"],
            ["Mary S.", 10, 10, 24, "Completed"],
          ],
        },
      ],
    },

    {
      slug: "maintenance",
      iconName: "Wrench",
      name: "Maintenance",
      group: "Operations",
      blurb: "Faults reported around the property, by priority and status.",
      kpis: [
        { label: "Open tickets", value: "12", tone: "warn" },
        { label: "Urgent", value: "3", tone: "bad" },
        { label: "Rooms out of order", value: "5", tone: "bad" },
        { label: "Closed this week", value: "21", tone: "good" },
      ],
      actions: [
        { label: "Log fault", variant: "primary" },
        { label: "Assign technician" },
        { label: "Return room to service", section: "rooms" },
      ],
      blocks: [
        {
          kind: "tickets",
          title: "Maintenance board",
          lanes: [
            {
              label: "Urgent",
              tone: "bad",
              tickets: [
                { ref: "MT-118", table: "Room 106", timer: "2 days", priority: "Guest impact", items: ["Air conditioning not cooling"], action: "Assign" },
                { ref: "MT-121", table: "Kitchen", timer: "4 hrs", priority: "Operations", items: ["Cold room compressor noise"], action: "Assign" },
              ],
            },
            {
              label: "In progress",
              tone: "warn",
              tickets: [
                { ref: "MT-115", table: "Room 303", timer: "6 days", priority: "Refurbishment", items: ["Bathroom retiling"], action: "Update" },
              ],
            },
            {
              label: "Awaiting parts",
              tone: "info",
              tickets: [
                { ref: "MT-109", table: "Lift 2", timer: "9 days", priority: "Contractor", items: ["Door sensor on order"] },
              ],
            },
            {
              label: "Closed",
              tone: "good",
              tickets: [
                { ref: "MT-104", table: "Room 210", items: ["Shower mixer replaced"] },
              ],
            },
          ],
        },
        {
          kind: "table",
          title: "Cost of maintenance this month",
          columns: ["Category", "Tickets", "Labour", "Parts", "Total", "Status"],
          numericColumns: [1, 2, 3, 4],
          statusColumn: 5,
          rows: [
            ["Air conditioning", 6, "K 4,200", "K 9,800", "K 14,000", "Posted"],
            ["Plumbing", 8, "K 3,100", "K 2,400", "K 5,500", "Posted"],
            ["Electrical", 4, "K 2,600", "K 1,900", "K 4,500", "Posted"],
            ["Lifts", 1, "K 0", "K 18,400", "K 18,400", "Pending"],
          ],
        },
      ],
    },

    {
      slug: "folios",
      iconName: "FileText",
      name: "Folios & billing",
      group: "Billing",
      blurb: "Open guest folios with every posted charge line.",
      kpis: [
        { label: "Open folios", value: "37" },
        { label: "Folio balance", value: "K 128,450" },
        { label: "Charges posted today", value: "94" },
        { label: "Disputed lines", value: "1", tone: "warn" },
      ],
      actions: [
        { label: "Open folio", variant: "primary" },
        { label: "Post charge" },
        { label: "Take payment", section: "payments" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Folio 312 — L. Phiri (3 nights)",
          columns: ["Date", "Description", "Source", "Debit", "Credit", "Status"],
          numericColumns: [3, 4],
          statusColumn: 5,
          rows: [
            ["10 Sep", "Room charge — Deluxe King", "Front desk", "K 1,350", "—", "Posted"],
            ["10 Sep", "Dinner — restaurant", "Hotel POS", "K 420", "—", "Posted"],
            ["11 Sep", "Room charge — Deluxe King", "Front desk", "K 1,350", "—", "Posted"],
            ["11 Sep", "Laundry", "Housekeeping", "K 180", "—", "Posted"],
            ["11 Sep", "Deposit received", "Cashier", "—", "K 2,000", "Posted"],
            ["12 Sep", "Bar charge", "Hotel POS", "K 480", "—", "Posted"],
            ["12 Sep", "Breakfast", "Hotel POS", "K 260", "—", "Posted"],
          ],
        },
        {
          kind: "panel",
          title: "Folio summary",
          items: [
            { label: "Total charges", value: "K 4,040" },
            { label: "Total credits", value: "K 2,000" },
            { label: "Balance due", value: "K 2,040", tone: "warn" },
            { label: "Billing instruction", value: "Room & tax to company, extras to guest" },
          ],
        },
      ],
    },

    {
      slug: "pos",
      iconName: "Utensils",
      name: "Restaurant & hotel POS",
      group: "Billing",
      blurb: "Restaurant, bar and spa sales routed to folios or settled at the outlet.",
      kpis: [
        { label: "Outlet sales today", value: "K 38,420", tone: "good" },
        { label: "Charged to room", value: "K 14,860" },
        { label: "Cash & card", value: "K 23,560" },
        { label: "Open tabs", value: "5", tone: "warn" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Outlet takings",
          columns: ["Outlet", "Covers", "Sales", "To room", "Settled", "Status"],
          numericColumns: [1, 2, 3, 4],
          statusColumn: 5,
          rows: [
            ["Terrace Restaurant", 86, "K 19,240", "K 8,120", "K 11,120", "Open"],
            ["Lobby Bar", 54, "K 9,860", "K 4,340", "K 5,520", "Open"],
            ["Pool Deck", 31, "K 5,120", "K 1,400", "K 3,720", "Open"],
            ["Spa", 12, "K 4,200", "K 1,000", "K 3,200", "Closed"],
          ],
        },
      ],
    },

    {
      slug: "payments",
      iconName: "CreditCard",
      name: "Payments & deposits",
      group: "Billing",
      blurb: "Deposits held, settlements taken and the method mix.",
      actions: [
        { label: "Receive payment", variant: "primary" },
        { label: "Record deposit" },
        { label: "Refund", variant: "ghost" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Payments today",
          columns: ["Time", "Guest / account", "Method", "Type", "Amount", "Status"],
          numericColumns: [4],
          statusColumn: 5,
          rows: [
            ["07:12", "M. Banda", "Card", "Settlement", "K 3,720", "Cleared"],
            ["11:05", "Zambezi Mining Ltd", "Bank transfer", "Deposit", "K 12,000", "Cleared"],
            ["14:22", "Copperbelt Tours", "Mobile money", "Deposit", "K 6,500", "Cleared"],
            ["17:40", "P. Zulu", "Cash", "Part settlement", "K 1,000", "Cleared"],
            ["19:05", "N. Chanda", "Card", "Pre-authorisation", "K 4,050", "Held"],
          ],
        },
        {
          kind: "panel",
          title: "Method mix (today)",
          items: [
            { label: "Card", value: "K 14,320 · 52%" },
            { label: "Cash", value: "K 5,480 · 20%" },
            { label: "Mobile money", value: "K 6,500 · 24%" },
            { label: "Bank transfer", value: "K 12,000 · deposits" },
          ],
        },
      ],
    },

    {
      slug: "night-audit",
      iconName: "Moon",
      name: "Night audit",
      group: "Controls",
      blurb: "The end-of-day close: post room charges, roll the date, hand off to accounting.",
      blocks: [
        {
          kind: "table",
          title: "Night audit checklist",
          columns: ["Step", "Description", "Records", "Value", "Status"],
          numericColumns: [2, 3],
          statusColumn: 4,
          rows: [
            ["1", "Post room & tax charges", 37, "K 48,320", "Complete"],
            ["2", "Close outlet tabs", 5, "K 3,180", "Complete"],
            ["3", "Reconcile cashier drawers", 3, "K 5,480", "Complete"],
            ["4", "No-show and cancellation review", 2, "K 1,960", "Complete"],
            ["5", "Roll business date", 1, "—", "Ready"],
            ["6", "Post day summary to ledger", 1, "K 86,740", "Ready"],
          ],
        },
        {
          kind: "notes",
          title: "Audit exceptions",
          lines: [
            "Room 203 departed with K 1,340 outstanding — flagged to the duty manager.",
            "One disputed bar line on folio 417 held for review; not posted to revenue.",
          ],
        },
      ],
    },

    {
      slug: "inventory",
      iconName: "Boxes",
      name: "Inventory",
      group: "Costs",
      blurb: "Linen, amenities, minibar and kitchen stock held across the property.",
      kpis: [
        { label: "Stock value", value: "K 386,400" },
        { label: "Stores", value: "5" },
        { label: "Below reorder", value: "9", tone: "warn" },
        { label: "Minibar variance", value: "K 1,240", tone: "warn" },
      ],
      actions: [
        { label: "Stock count", variant: "primary" },
        { label: "Issue to floor" },
        { label: "Reorder list" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Store balances",
          columns: ["Item", "Store", "On hand", "Reorder at", "Unit cost", "Value", "Status"],
          numericColumns: [2, 3, 4, 5],
          statusColumn: 6,
          rows: [
            ["Bath towels", "Linen store", "412", "300", "K 78", "K 32,136", "Good"],
            ["Bed sheets (queen)", "Linen store", "268", "300", "K 145", "K 38,860", "Low"],
            ["Shower gel 40ml", "Amenities", "1,840", "1,200", "K 6", "K 11,040", "Good"],
            ["Minibar water", "Minibar store", "96", "150", "K 8", "K 768", "Low"],
            ["Coffee sachets", "Amenities", "2,410", "1,500", "K 3", "K 7,230", "Good"],
          ],
        },
        {
          kind: "chart",
          variant: "bars",
          title: "Stock value by store",
          unit: "K ",
          series: [
            { label: "Linen store", value: 168400 },
            { label: "Kitchen store", value: 121300 },
            { label: "Amenities", value: 54200 },
            { label: "Minibar store", value: 28900, tone: "warn" },
            { label: "Engineering", value: 13600 },
          ],
        },
      ],
    },

    {
      slug: "expenses",
      iconName: "Receipt",
      name: "Expenses & purchasing",
      group: "Costs",
      blurb: "Supplier bills, purchase orders and operating cost control.",
      kpis: [
        { label: "Operating costs MTD", value: "K 612,400" },
        { label: "Open purchase orders", value: "9" },
        { label: "Bills awaiting approval", value: "4", tone: "warn" },
        { label: "Cost ratio", value: "48%", tone: "info" },
      ],
      actions: [
        { label: "Record expense", variant: "primary" },
        { label: "New purchase order" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Recent supplier bills",
          columns: ["Bill", "Supplier", "Category", "Date", "Amount", "Status"],
          numericColumns: [4],
          statusColumn: 5,
          rows: [
            ["BILL-2291", "Lusaka Fresh Produce", "Food & beverage", "09 Sep", "K 42,300", "Approved"],
            ["BILL-2292", "ZESCO", "Utilities", "09 Sep", "K 88,400", "Paid"],
            ["BILL-2293", "CleanPro Supplies", "Housekeeping", "10 Sep", "K 16,750", "Pending"],
            ["BILL-2294", "AirTech Services", "Maintenance", "11 Sep", "K 9,200", "Pending"],
            ["BILL-2295", "Copper Linen Co", "Laundry & linen", "11 Sep", "K 23,600", "Approved"],
          ],
        },
      ],
    },

    {
      slug: "staff",
      iconName: "UserSquare",
      name: "Staff & users",
      group: "People",
      blurb: "Departments, shifts and system access roles.",
      blocks: [
        {
          kind: "table",
          title: "Team on duty",
          columns: ["Name", "Department", "Role", "Shift", "System access", "Status"],
          statusColumn: 5,
          rows: [
            ["D. Mulenga", "Front office", "Duty manager", "07:00 – 16:00", "Manager", "On shift"],
            ["Grace M.", "Housekeeping", "Room attendant", "07:00 – 15:00", "Operations", "On shift"],
            ["Joseph K.", "Housekeeping", "Room attendant", "07:00 – 15:00", "Operations", "On shift"],
            ["S. Ngoma", "F&B", "Outlet cashier", "12:00 – 22:00", "Cashier", "On shift"],
            ["B. Lungu", "Finance", "Night auditor", "22:00 – 06:00", "Accounting", "Off shift"],
          ],
        },
        {
          kind: "notes",
          title: "Access control",
          lines: [
            "Rate overrides and folio corrections require duty-manager approval.",
            "Night auditor is the only role permitted to roll the business date.",
            "Cashiers cannot reopen a closed shift; they raise an approval request instead.",
          ],
        },
      ],
    },

    {
      slug: "accounting",
      iconName: "Landmark",
      name: "Accounting impact",
      group: "Controls",
      blurb: "A read-only preview of the journal the night audit would produce.",
      blocks: [
        {
          kind: "table",
          title: "Sample night-audit journal (preview only)",
          note: "Illustrative posting. Nothing in this demo can post to a real ledger.",
          columns: ["Account", "Description", "Debit", "Credit"],
          numericColumns: [2, 3],
          rows: [
            ["1200 Guest ledger", "Room & tax charges", "K 48,320", "—"],
            ["4100 Room revenue", "Accommodation earned", "—", "K 41,655"],
            ["2200 VAT payable", "Output VAT 16%", "—", "K 6,665"],
            ["1000 Cash & bank", "Cashier settlements", "K 23,560", "—"],
            ["1200 Guest ledger", "Settlements applied", "—", "K 23,560"],
          ],
        },
        {
          kind: "panel",
          title: "Control checks",
          items: [
            { label: "Debits", value: "K 71,880" },
            { label: "Credits", value: "K 71,880" },
            { label: "Difference", value: "K 0.00 — balanced", tone: "good" },
            { label: "Posting state", value: "Preview only (demo)", tone: "info" },
          ],
        },
      ],
    },

    {
      slug: "revenue",
      iconName: "TrendingUp",
      name: "Revenue & performance",
      group: "Analysis",
      blurb: "Revenue split by room and service, with occupancy, ADR and RevPAR.",
      kpis: [
        { label: "Revenue MTD", value: "K 1,284,900", tone: "good" },
        { label: "Rooms share", value: "66%" },
        { label: "F&B share", value: "27%" },
        { label: "Other share", value: "7%" },
      ],
      blocks: [
        {
          kind: "table",
          title: "Revenue by stream",
          columns: ["Stream", "This month", "Last month", "Change", "Status"],
          numericColumns: [1, 2],
          statusColumn: 4,
          rows: [
            ["Rooms", "K 842,600", "K 781,200", "+7.9%", "Up"],
            ["Restaurant", "K 214,300", "K 226,800", "-5.5%", "Down"],
            ["Bar", "K 132,900", "K 118,400", "+12.2%", "Up"],
            ["Spa & other", "K 95,100", "K 88,700", "+7.2%", "Up"],
          ],
        },
        {
          kind: "table",
          title: "Operational metrics by week",
          columns: ["Week", "Occupancy", "ADR", "RevPAR", "Rooms sold"],
          numericColumns: [4],
          rows: [
            ["Wk 1", "71%", "K 1,204", "K 855", 238],
            ["Wk 2", "76%", "K 1,251", "K 951", 255],
            ["Wk 3", "82%", "K 1,290", "K 1,058", 275],
            ["Wk 4 (to date)", "78%", "K 1,240", "K 967", 187],
          ],
        },
      ],
    },

    {
      slug: "reports",
      iconName: "BarChart3",
      name: "Reports",
      group: "Analysis",
      blurb: "The report pack a property manager reviews each morning.",
      blocks: [
        {
          kind: "chart",
          variant: "bars",
          title: "Revenue by department — month to date",
          unit: "K ",
          series: [
            { label: "Rooms", value: 2841000, tone: "good" },
            { label: "Restaurant", value: 764000 },
            { label: "Bar", value: 318000 },
            { label: "Conference", value: 496000 },
            { label: "Laundry", value: 62000, tone: "warn" },
          ],
        },
        {
          kind: "table",
          title: "Report pack",
          columns: ["Report", "Question it answers", "Period", "Status"],
          statusColumn: 3,
          rows: [
            ["Manager's flash", "How did yesterday trade?", "Daily", "Ready"],
            ["Occupancy & rate", "Are we selling the right rooms at the right price?", "Daily / monthly", "Ready"],
            ["Guest ledger aging", "Who owes us and for how long?", "Monthly", "Ready"],
            ["Outlet sales", "Which outlets and items drive food & beverage?", "Daily", "Ready"],
            ["Departmental P&L", "Which departments actually make money?", "Monthly", "Ready"],
            ["Housekeeping productivity", "How long does a room turnover take?", "Weekly", "Ready"],
          ],
        },
      ],
    },

    {
      slug: "settings",
      iconName: "Settings",
      name: "Settings",
      group: "Settings",
      blurb: "Property configuration — room types, rates, taxes and user roles.",
      actions: [{ label: "Edit settings", variant: "primary" }],
      blocks: [
        {
          kind: "panel",
          title: "Property configuration",
          items: [
            { label: "Rooms", value: "96 across 3 floors" },
            { label: "Room types", value: "Standard, Executive, Suite" },
            { label: "Check-in / check-out", value: "14:00 / 10:00" },
            { label: "Tourism levy", value: "1.5%" },
            { label: "VAT", value: "16%" },
            { label: "Currency", value: "ZMW (K), USD rates supported" },
          ],
        },
        {
          kind: "table",
          title: "Rate plans",
          columns: ["Plan", "Room type", "Rate", "Includes", "Cancellation", "Status"],
          numericColumns: [2],
          statusColumn: 5,
          rows: [
            ["Best available", "Standard", "K 1,150", "Breakfast", "24 hrs", "Active"],
            ["Corporate", "Standard", "K 950", "Breakfast, Wi-Fi", "Same day", "Active"],
            ["Weekend escape", "Executive", "K 1,650", "Breakfast, late checkout", "48 hrs", "Active"],
            ["Suite package", "Suite", "K 3,800", "All meals, airport transfer", "72 hrs", "Active"],
          ],
        },
        {
          kind: "table",
          title: "Roles & permissions",
          columns: ["Role", "Reservations", "Check-in", "Post charges", "Take payment", "Reports"],
          rows: [
            ["Receptionist", "Yes", "Yes", "Yes", "Yes", "Own shift"],
            ["Housekeeping", "No", "No", "No", "No", "Task list"],
            ["Night auditor", "Yes", "Yes", "Yes", "Yes", "Daily"],
            ["General manager", "Yes", "Yes", "Yes", "Yes", "All"],
          ],
        },
      ],
    },
  ],
};
