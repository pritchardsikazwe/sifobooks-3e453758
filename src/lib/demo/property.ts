import type { DemoIndustry } from "./types";

export const propertyDemo: DemoIndustry = {
  slug: "property",
  name: "Property & Tenancy",
  product: "SifoProperty",
  tagline: "Rental operations from tenant onboarding to collection.",
  description: "Sample apartments, house complexes, boarding houses, monthly leases, daily stays, BnB bookings, rent charges, payments, maintenance and utilities.",
  highlights: ["Rent roll & arrears","Tenant & lease management","Daily/BnB bookings","Maintenance & utilities","Boarding houses"],
  accent: { gradient: "from-amber-500/15 via-background to-emerald-500/10", text: "text-amber-700", ring: "ring-amber-500/30" },
  sections: [
    { slug:"dashboard", name:"Property dashboard", group:"Operations", blurb:"Occupancy, rent roll and collections.", iconName:"Building2",
      kpis:[{label:"Units",value:"48"},{label:"Occupied",value:"41",tone:"good"},{label:"Rent roll",value:"K 186,400"},{label:"Arrears",value:"K 12,850",tone:"warn"}],
      blocks:[
        {kind:"grid",title:"Portfolio",cells:[{label:"12 Apartments",sub:"8 occupied",tone:"good"},{label:"House Complex A",sub:"14 units",tone:"good"},{label:"Boarding House",sub:"38 beds",tone:"info"},{label:"4 BnB rooms",sub:"3 booked",tone:"warn"}]},
        {kind:"table",title:"Rent collection",columns:["Tenant","Unit","Due","Paid","Balance"],rows:[["M. Banda","A-04","K 4,500","K 4,500","K 0"],["C. Phiri","B-11","K 3,800","K 2,000","K 1,800"],["J. Mwansa","C-02","K 2,900","K 0","K 2,900"]],numericColumns:[2,3,4],statusColumn:4}
      ]},
    { slug:"tenants", name:"Tenants", group:"Operations", blurb:"Tenant profiles, contacts and lease history.", iconName:"Users",
      blocks:[{kind:"table",title:"Tenant register",columns:["Tenant No.","Tenant","Phone","Unit","Status"],rows:[["T-0001","M. Banda","0977 000001","A-04","Active"],["T-0002","C. Phiri","0966 000002","B-11","Arrears"],["T-0003","J. Mwansa","0955 000003","C-02","Active"]],statusColumn:4}]},
    { slug:"daily-bnb", name:"Daily & BnB", group:"Bookings", blurb:"Short stays, deposits, check-in and checkout.", iconName:"CalendarDays",
      blocks:[{kind:"board",title:"Today's stays",columns:[{label:"Reserved",tone:"info",cards:[{title:"Room BnB-02",meta:"2 nights · K 1,200"}]},{label:"Checked in",tone:"good",cards:[{title:"Room BnB-01",meta:"1 night · K 650"}]},{label:"Checkout",tone:"warn",cards:[{title:"Room BnB-03",meta:"Due 10:00"}]}]}]},
    { slug:"boarding", name:"Boarding houses", group:"Operations", blurb:"Beds, allocations and occupancy.", iconName:"BedDouble",
      blocks:[{kind:"map",title:"Bed allocation",areas:[{label:"House A",cells:[{label:"A-01",state:"Occupied",tone:"good",meta:"Student 014"},{label:"A-02",state:"Occupied",tone:"good",meta:"Student 022"},{label:"A-03",state:"Vacant",tone:"neutral"},{label:"A-04",state:"Maintenance",tone:"warn"}]}]}]},
    { slug:"maintenance", name:"Maintenance", group:"Operations", blurb:"Repairs and property upkeep.", iconName:"Wrench",
      blocks:[{kind:"board",title:"Maintenance queue",columns:[{label:"Open",tone:"warn",cards:[{title:"Leaking tap · A-04",meta:"Plumbing"}]},{label:"In progress",tone:"info",cards:[{title:"Gate repair",meta:"House Complex A"}]},{label:"Completed",tone:"good",cards:[{title:"Room repaint",meta:"BnB-03"}]}]}]}
  ]
};