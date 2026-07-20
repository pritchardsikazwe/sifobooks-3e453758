// Industry registry — declarative. One entry per industry.
// Each industry lists the modules a company can install and any
// chart-of-accounts rows that should be seeded on first install.

export type CoASeed = {
  account_code: string;
  account_name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
};

export type ModuleDef = {
  key: string;         // stable id, stored in company_modules.module_key
  label: string;
  description: string;
};

export type Industry = {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  modules: ModuleDef[];
  coa: CoASeed[];
};

const M = (key: string, label: string, description: string): ModuleDef => ({ key, label, description });

export const INDUSTRIES: Industry[] = [
  {
    id: "general", label: "General Business", emoji: "🏢",
    tagline: "Standard accounting for services, trading and consultancies.",
    modules: [
      M("sales", "Sales & Invoicing", "Quotes, invoices, receipts."),
      M("purchases", "Purchases & Bills", "Suppliers, PO, bills, payments."),
      M("inventory", "Inventory", "Stock items and warehouses."),
    ],
    coa: [],
  },
  {
    id: "school", label: "School", emoji: "🏫",
    tagline: "Students, classes, fees, exams, transport.",
    modules: [
      M("school_students", "Students & Guardians", "Admission, registration, guardians."),
      M("school_classes", "Classes & Streams", "Classes, streams, subjects, teachers."),
      M("school_fees", "Fees Management", "Fee structures, invoicing, receipts."),
      M("school_exam", "Examinations", "Exams and report cards."),
      M("school_library", "Library", "Books, loans, returns."),
      M("school_transport", "School Bus", "Routes and passengers."),
      M("school_hostel", "Hostel", "Rooms and boarders."),
      M("school_attendance", "Attendance", "Student attendance."),
    ],
    coa: [
      { account_code: "4100", account_name: "Tuition Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Exam Fees", account_type: "revenue" },
      { account_code: "4120", account_name: "Library Fees", account_type: "revenue" },
      { account_code: "4130", account_name: "Boarding Fees", account_type: "revenue" },
      { account_code: "4140", account_name: "Transport Fees", account_type: "revenue" },
      { account_code: "4150", account_name: "Uniform Sales", account_type: "revenue" },
      { account_code: "4160", account_name: "Books Sales", account_type: "revenue" },
      { account_code: "4170", account_name: "Donations Received", account_type: "revenue" },
      { account_code: "5100", account_name: "Teacher Salaries", account_type: "expense" },
      { account_code: "5110", account_name: "School Bus Fuel", account_type: "expense" },
      { account_code: "5120", account_name: "School Utilities", account_type: "expense" },
    ],
  },
  {
    id: "college", label: "College", emoji: "🎓", tagline: "Tertiary tuition, semesters, exams.",
    modules: [
      M("college_students", "Students", "Enrolment and records."),
      M("college_programs", "Programs & Courses", "Programs, semesters, units."),
      M("college_fees", "Fees & Billing", "Tuition invoicing and receipts."),
      M("college_exam", "Examinations", "Results and transcripts."),
    ],
    coa: [
      { account_code: "4100", account_name: "Tuition Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Examination Fees", account_type: "revenue" },
      { account_code: "4120", account_name: "Application Fees", account_type: "revenue" },
      { account_code: "5100", account_name: "Lecturer Salaries", account_type: "expense" },
    ],
  },
  {
    id: "university", label: "University", emoji: "🏛️", tagline: "Faculties, students, research.",
    modules: [
      M("uni_students", "Students", "Admission and records."),
      M("uni_faculties", "Faculties & Departments", "Faculties, departments, programs."),
      M("uni_fees", "Fees & Billing", "Tuition and residence billing."),
      M("uni_research", "Research Grants", "Grants and projects."),
    ],
    coa: [
      { account_code: "4100", account_name: "Tuition Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Research Grants", account_type: "revenue" },
      { account_code: "4120", account_name: "Residence Income", account_type: "revenue" },
    ],
  },
  {
    id: "hospital", label: "Hospital", emoji: "🏥", tagline: "Patients, wards, billing, insurance.",
    modules: [
      M("hosp_patients", "Patients", "Registration and history."),
      M("hosp_appointments", "Appointments", "Bookings and reminders."),
      M("hosp_wards", "Wards & Beds", "Admissions and discharge."),
      M("hosp_billing", "Billing & Insurance", "Patient billing and insurance claims."),
      M("hosp_pharmacy", "In-House Pharmacy", "Dispensary and stock."),
    ],
    coa: [
      { account_code: "4100", account_name: "Consultation Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Ward Income", account_type: "revenue" },
      { account_code: "4120", account_name: "Laboratory Income", account_type: "revenue" },
      { account_code: "4130", account_name: "Insurance Receivables", account_type: "asset" },
    ],
  },
  {
    id: "pharmacy", label: "Pharmacy", emoji: "💊", tagline: "POS with batch, expiry, prescriptions.",
    modules: [
      M("ph_inventory", "Medicine Inventory", "Batch and expiry tracking."),
      M("ph_pos", "POS", "Sales terminal with barcode."),
      M("ph_prescriptions", "Prescriptions", "Prescription capture."),
      M("ph_insurance", "Insurance Claims", "Claim submission and tracking."),
    ],
    coa: [
      { account_code: "4100", account_name: "Drug Sales", account_type: "revenue" },
      { account_code: "4110", account_name: "OTC Sales", account_type: "revenue" },
      { account_code: "4120", account_name: "Prescription Sales", account_type: "revenue" },
      { account_code: "1300", account_name: "Insurance Receivables", account_type: "asset" },
      { account_code: "5100", account_name: "Expired Medicines Write-off", account_type: "expense" },
    ],
  },
  {
    id: "retail", label: "Retail Shop", emoji: "🛍️", tagline: "POS, barcode, inventory.",
    modules: [
      M("retail_pos", "POS", "Fast checkout with barcode."),
      M("retail_inventory", "Inventory", "Stock, transfers, reorder levels."),
      M("retail_customers", "Customers", "Loyalty and history."),
    ],
    coa: [
      { account_code: "4100", account_name: "Retail Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Cost of Goods Sold", account_type: "expense" },
    ],
  },
  {
    id: "phone_shop", label: "Phone Accessories Shop", emoji: "📱", tagline: "Phones, IMEI, repairs, warranties.",
    modules: [
      M("phone_pos", "POS", "Sales with IMEI capture."),
      M("phone_repairs", "Repairs", "Job cards and status."),
      M("phone_warranty", "Warranty Tracking", "Warranty registry."),
      M("phone_inventory", "Inventory", "Stock and transfers."),
    ],
    coa: [
      { account_code: "4100", account_name: "Phone Sales", account_type: "revenue" },
      { account_code: "4110", account_name: "Accessory Sales", account_type: "revenue" },
      { account_code: "4120", account_name: "Repair Income", account_type: "revenue" },
      { account_code: "5110", account_name: "Warranty Expenses", account_type: "expense" },
    ],
  },
  {
    id: "manufacturing", label: "Manufacturing", emoji: "🏭", tagline: "BOM, production, factories.",
    modules: [
      M("mfg_raw", "Raw Materials", "Raw materials stock."),
      M("mfg_bom", "Bill of Materials", "Recipes and versions."),
      M("mfg_production", "Production Orders", "Work orders and status."),
      M("mfg_quality", "Quality Control", "Inspections and holds."),
    ],
    coa: [
      { account_code: "1200", account_name: "Raw Materials", account_type: "asset" },
      { account_code: "1210", account_name: "Work in Progress", account_type: "asset" },
      { account_code: "1220", account_name: "Finished Goods", account_type: "asset" },
      { account_code: "5200", account_name: "Factory Wages", account_type: "expense" },
      { account_code: "5210", account_name: "Factory Electricity", account_type: "expense" },
      { account_code: "5220", account_name: "Machine Maintenance", account_type: "expense" },
    ],
  },
  {
    id: "law", label: "Law Firm", emoji: "⚖️", tagline: "Clients, cases, trust accounts, billing.",
    modules: [
      M("law_clients", "Clients", "Client registry and KYC."),
      M("law_cases", "Cases & Court Dates", "Matters and hearings."),
      M("law_time", "Time Tracking", "Billable time."),
      M("law_trust", "Trust Accounts", "Client trust ledgers."),
      M("law_billing", "Billing", "Retainers and invoices."),
    ],
    coa: [
      { account_code: "4100", account_name: "Legal Fees", account_type: "revenue" },
      { account_code: "4110", account_name: "Consultation Income", account_type: "revenue" },
      { account_code: "4120", account_name: "Retainer Income", account_type: "revenue" },
      { account_code: "2200", account_name: "Client Trust Deposits", account_type: "liability" },
      { account_code: "1290", account_name: "Trust Bank Account", account_type: "asset" },
    ],
  },
  {
    id: "transport", label: "Transport Company", emoji: "🚚", tagline: "Trips, drivers, fuel, maintenance.",
    modules: [
      M("tr_trips", "Trips", "Trip logs and manifests."),
      M("tr_vehicles", "Vehicles", "Fleet registry."),
      M("tr_drivers", "Drivers", "Driver records."),
      M("tr_fuel", "Fuel", "Fuel purchases and consumption."),
      M("tr_maintenance", "Maintenance", "Service and repairs."),
    ],
    coa: [
      { account_code: "4100", account_name: "Transport Income", account_type: "revenue" },
      { account_code: "5100", account_name: "Fuel", account_type: "expense" },
      { account_code: "5110", account_name: "Vehicle Repairs", account_type: "expense" },
      { account_code: "5120", account_name: "Tyres", account_type: "expense" },
      { account_code: "5130", account_name: "Vehicle Insurance", account_type: "expense" },
    ],
  },
  {
    id: "fleet", label: "Fleet Management", emoji: "🛻", tagline: "GPS, licenses, maintenance.",
    modules: [
      M("fl_vehicles", "Vehicles", "Registry with GPS ids."),
      M("fl_maintenance", "Maintenance", "Scheduled service."),
      M("fl_licenses", "Licenses & Insurance", "Renewals tracking."),
      M("fl_fuel", "Fuel", "Fuel cards and usage."),
    ],
    coa: [
      { account_code: "5100", account_name: "Fleet Fuel", account_type: "expense" },
      { account_code: "5110", account_name: "Fleet Maintenance", account_type: "expense" },
    ],
  },
  {
    id: "car_hire", label: "Car Hire", emoji: "🚗", tagline: "Bookings, deposits, inspection.",
    modules: [
      M("ch_bookings", "Bookings", "Reservations."),
      M("ch_contracts", "Contracts", "Rental agreements."),
      M("ch_inspection", "Vehicle Inspection", "Check-in / check-out."),
      M("ch_deposits", "Deposits", "Security deposits."),
    ],
    coa: [
      { account_code: "4100", account_name: "Rental Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Damage Charges", account_type: "revenue" },
      { account_code: "2210", account_name: "Customer Deposits", account_type: "liability" },
    ],
  },
  {
    id: "hire_purchase", label: "Hire Purchase", emoji: "📆", tagline: "Instalment sales with interest.",
    modules: [
      M("hp_contracts", "Contracts", "Hire purchase agreements."),
      M("hp_installments", "Instalments", "Schedule and receipts."),
      M("hp_reminders", "SMS Reminders", "Automated reminders."),
    ],
    coa: [
      { account_code: "4100", account_name: "Hire Purchase Sales", account_type: "revenue" },
      { account_code: "1310", account_name: "Instalment Receivable", account_type: "asset" },
      { account_code: "4110", account_name: "Interest Income (HP)", account_type: "revenue" },
      { account_code: "5100", account_name: "Bad Debts (HP)", account_type: "expense" },
    ],
  },
  {
    id: "land", label: "Land Installment Sales", emoji: "🗺️", tagline: "Plots, contracts, title deeds.",
    modules: [
      M("land_plots", "Plots", "Plots with survey numbers."),
      M("land_contracts", "Contracts", "Sale agreements."),
      M("land_installments", "Instalments", "Payment plans."),
    ],
    coa: [
      { account_code: "4100", account_name: "Land Sales", account_type: "revenue" },
      { account_code: "1320", account_name: "Land Instalment Receivable", account_type: "asset" },
      { account_code: "4110", account_name: "Interest Income (Land)", account_type: "revenue" },
      { account_code: "5110", account_name: "Survey Costs", account_type: "expense" },
      { account_code: "5120", account_name: "Legal Fees", account_type: "expense" },
    ],
  },
  {
    id: "hotel", label: "Hotel", emoji: "🏨", tagline: "Rooms, reservations, housekeeping.",
    modules: [
      M("hotel_rooms", "Rooms", "Rooms and rates."),
      M("hotel_reservations", "Reservations", "Bookings and check-in."),
      M("hotel_housekeeping", "Housekeeping", "Room status."),
      M("hotel_restaurant", "Restaurant", "F&B POS."),
    ],
    coa: [
      { account_code: "4100", account_name: "Room Revenue", account_type: "revenue" },
      { account_code: "4110", account_name: "Food & Beverage", account_type: "revenue" },
      { account_code: "4120", account_name: "Laundry Income", account_type: "revenue" },
    ],
  },
  {
    id: "restaurant", label: "Restaurant", emoji: "🍽️", tagline: "Kitchen orders, tables, recipes.",
    modules: [
      M("rest_orders", "Orders", "Table and takeaway orders."),
      M("rest_kitchen", "Kitchen Display", "KOT / KDS."),
      M("rest_recipes", "Recipes", "Recipe cards."),
      M("rest_inventory", "Inventory", "Food and beverage stock."),
    ],
    coa: [
      { account_code: "4100", account_name: "Food Sales", account_type: "revenue" },
      { account_code: "4110", account_name: "Beverage Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Cost of Food", account_type: "expense" },
    ],
  },
  {
    id: "lending", label: "Lending / Microfinance", emoji: "💰", tagline: "Loans, repayments, interest.",
    modules: [
      M("ln_borrowers", "Borrowers", "KYC and history."),
      M("ln_loans", "Loans", "Loan products and schedules."),
      M("ln_repayments", "Repayments", "Instalment tracking."),
      M("ln_collateral", "Collateral", "Security registry."),
    ],
    coa: [
      { account_code: "1400", account_name: "Loan Portfolio", account_type: "asset" },
      { account_code: "4100", account_name: "Interest Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Penalty Income", account_type: "revenue" },
      { account_code: "5100", account_name: "Bad Debts", account_type: "expense" },
      { account_code: "5110", account_name: "Loan Loss Provision", account_type: "expense" },
    ],
  },
  {
    id: "sacco", label: "SACCO", emoji: "🤝", tagline: "Members, shares, savings, loans.",
    modules: [
      M("sacco_members", "Members", "Member registry."),
      M("sacco_shares", "Shares & Savings", "Share capital and savings."),
      M("sacco_loans", "Loans", "Member loans."),
    ],
    coa: [
      { account_code: "3100", account_name: "Member Share Capital", account_type: "equity" },
      { account_code: "2300", account_name: "Member Savings", account_type: "liability" },
      { account_code: "1400", account_name: "Loans to Members", account_type: "asset" },
    ],
  },
  {
    id: "property", label: "Property Management", emoji: "🏘️", tagline: "Properties, tenants, rent, leases.",
    modules: [
      M("pm_properties", "Properties", "Buildings and units."),
      M("pm_tenants", "Tenants", "Tenant registry."),
      M("pm_leases", "Lease Agreements", "Leases and terms."),
      M("pm_rent", "Rent Collection", "Monthly rent invoicing."),
      M("pm_maintenance", "Maintenance", "Service requests."),
    ],
    coa: [
      { account_code: "4100", account_name: "Rental Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Service Charge Income", account_type: "revenue" },
      { account_code: "2210", account_name: "Tenant Deposits", account_type: "liability" },
    ],
  },
  {
    id: "real_estate", label: "Real Estate", emoji: "🏗️", tagline: "Listings, sales, commissions.",
    modules: [
      M("re_listings", "Listings", "Properties for sale."),
      M("re_deals", "Deals", "Offers and closings."),
      M("re_commissions", "Commissions", "Agent commissions."),
    ],
    coa: [
      { account_code: "4100", account_name: "Commission Income", account_type: "revenue" },
      { account_code: "5100", account_name: "Agent Commissions", account_type: "expense" },
    ],
  },
  {
    id: "construction", label: "Construction", emoji: "🚧", tagline: "Projects, BOQs, progress billing.",
    modules: [
      M("con_projects", "Projects", "Sites and phases."),
      M("con_boq", "BOQs", "Bill of quantities."),
      M("con_progress", "Progress Certificates", "Certified work."),
      M("con_materials", "Materials", "Site materials."),
      M("con_labour", "Labour", "Site labour."),
    ],
    coa: [
      { account_code: "4100", account_name: "Contract Revenue", account_type: "revenue" },
      { account_code: "1220", account_name: "Work in Progress", account_type: "asset" },
      { account_code: "5100", account_name: "Site Labour", account_type: "expense" },
      { account_code: "5110", account_name: "Site Materials", account_type: "expense" },
    ],
  },
  {
    id: "ngo", label: "NGO / Nonprofit", emoji: "🤲", tagline: "Donors, grants, projects, fund accounting.",
    modules: [
      M("ngo_donors", "Donors", "Donor registry."),
      M("ngo_grants", "Grants & Donor Funds", "Grant agreements & tracking."),
      M("ngo_projects", "Projects", "Project budgets."),
      M("ngo_monitoring", "M&E", "Monitoring and evaluation."),
      M("ngo_workshops", "Workshops & Allowances", "Training events & participant allowances."),
      M("ngo_imprest", "Imprest Register", "Cash advances & retirements."),
      M("ngo_fixed_assets", "Fixed Assets", "Register with depreciation."),
    ],
    coa: [
      { account_code: "1010", account_name: "Bank — Operating", account_type: "asset" },
      { account_code: "1020", account_name: "Petty Cash", account_type: "asset" },
      { account_code: "1200", account_name: "Staff Advances", account_type: "asset" },
      { account_code: "1500", account_name: "Fixed Assets", account_type: "asset" },
      { account_code: "1590", account_name: "Accumulated Depreciation", account_type: "asset" },
      { account_code: "2200", account_name: "PAYE Payable", account_type: "liability" },
      { account_code: "2210", account_name: "NAPSA Payable", account_type: "liability" },
      { account_code: "2220", account_name: "NHIMA Payable", account_type: "liability" },
      { account_code: "3000", account_name: "Accumulated Fund", account_type: "equity" },
      { account_code: "4100", account_name: "Grant Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Donations Received", account_type: "revenue" },
      { account_code: "5100", account_name: "Programme Expenses", account_type: "expense" },
      { account_code: "5200", account_name: "Workshop & Training", account_type: "expense" },
      { account_code: "5300", account_name: "Staff Salaries & Allowances", account_type: "expense" },
      { account_code: "5700", account_name: "Depreciation Expense", account_type: "expense" },
    ],
  },
  {
    id: "church", label: "Church", emoji: "⛪", tagline: "Members, offerings, tithes.",
    modules: [
      M("ch_members", "Members", "Membership registry."),
      M("ch_offerings", "Offerings & Tithes", "Contribution tracking."),
      M("ch_projects", "Church Projects", "Building funds etc."),
    ],
    coa: [
      { account_code: "4100", account_name: "Tithes", account_type: "revenue" },
      { account_code: "4110", account_name: "Offerings", account_type: "revenue" },
      { account_code: "4120", account_name: "Project Contributions", account_type: "revenue" },
    ],
  },
  {
    id: "agri", label: "Agriculture", emoji: "🌾", tagline: "Fields, livestock, harvest.",
    modules: [
      M("ag_fields", "Fields", "Farm blocks and crops."),
      M("ag_livestock", "Livestock", "Herds and health."),
      M("ag_harvest", "Harvest", "Yields and storage."),
    ],
    coa: [
      { account_code: "4100", account_name: "Crop Sales", account_type: "revenue" },
      { account_code: "4110", account_name: "Livestock Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Seed & Fertilizer", account_type: "expense" },
      { account_code: "5110", account_name: "Feed & Veterinary", account_type: "expense" },
    ],
  },
  {
    id: "fuel", label: "Fuel Station", emoji: "⛽", tagline: "Pumps, tanks, shifts.",
    modules: [
      M("fu_pumps", "Pumps & Tanks", "Meters and dips."),
      M("fu_shifts", "Shifts", "Attendant shifts."),
      M("fu_pos", "Shop POS", "Convenience store POS."),
    ],
    coa: [
      { account_code: "4100", account_name: "Fuel Sales", account_type: "revenue" },
      { account_code: "4110", account_name: "Shop Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Cost of Fuel", account_type: "expense" },
    ],
  },
  {
    id: "hardware", label: "Hardware Store", emoji: "🔨", tagline: "Trading with wide SKU count.",
    modules: [
      M("hw_pos", "POS", "Counter sales."),
      M("hw_inventory", "Inventory", "SKUs and stock levels."),
      M("hw_purchases", "Purchases", "Supplier orders."),
    ],
    coa: [
      { account_code: "4100", account_name: "Hardware Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Cost of Goods Sold", account_type: "expense" },
    ],
  },
  {
    id: "supermarket", label: "Supermarket", emoji: "🛒", tagline: "Multi-till POS, categories.",
    modules: [
      M("sm_pos", "POS Multi-till", "Fast checkout."),
      M("sm_inventory", "Inventory", "SKUs and shrinkage."),
      M("sm_promotions", "Promotions", "Discounts and specials."),
    ],
    coa: [
      { account_code: "4100", account_name: "Supermarket Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Cost of Goods Sold", account_type: "expense" },
      { account_code: "5110", account_name: "Shrinkage", account_type: "expense" },
    ],
  },
  {
    id: "salon", label: "Beauty Salon", emoji: "💇", tagline: "Bookings, services, stylists.",
    modules: [
      M("sl_services", "Services", "Service catalogue."),
      M("sl_bookings", "Bookings", "Appointments."),
      M("sl_stylists", "Stylists", "Stylist commissions."),
    ],
    coa: [
      { account_code: "4100", account_name: "Service Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Product Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Stylist Commissions", account_type: "expense" },
    ],
  },
  {
    id: "clinic", label: "Clinic", emoji: "🩺", tagline: "Patients, appointments, billing.",
    modules: [
      M("cl_patients", "Patients", "Patient registry."),
      M("cl_appointments", "Appointments", "Doctor bookings."),
      M("cl_billing", "Billing", "Consultation billing."),
    ],
    coa: [
      { account_code: "4100", account_name: "Consultation Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Procedure Income", account_type: "revenue" },
    ],
  },
  {
    id: "insurance", label: "Insurance Broker", emoji: "🛡️", tagline: "Policies, commissions, claims.",
    modules: [
      M("ins_policies", "Policies", "Policy registry."),
      M("ins_commissions", "Commissions", "Broker commissions."),
      M("ins_claims", "Claims", "Claims tracking."),
    ],
    coa: [
      { account_code: "4100", account_name: "Commission Income", account_type: "revenue" },
    ],
  },
  {
    id: "consultancy", label: "Consultancy", emoji: "🧠", tagline: "Retainers and project billing.",
    modules: [
      M("co_clients", "Clients", "Client registry."),
      M("co_engagements", "Engagements", "Project engagements."),
      M("co_time", "Time Tracking", "Billable time."),
    ],
    coa: [
      { account_code: "4100", account_name: "Consulting Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Retainer Income", account_type: "revenue" },
    ],
  },
  {
    id: "internet_cafe", label: "Internet Cafe", emoji: "💻", tagline: "Sessions, printing, POS.",
    modules: [
      M("ic_sessions", "Sessions", "Timed sessions."),
      M("ic_printing", "Printing", "Print / copy billing."),
    ],
    coa: [
      { account_code: "4100", account_name: "Internet Sessions", account_type: "revenue" },
      { account_code: "4110", account_name: "Printing Income", account_type: "revenue" },
    ],
  },
  {
    id: "courier", label: "Courier Company", emoji: "📦", tagline: "Shipments, tracking, invoicing.",
    modules: [
      M("cr_shipments", "Shipments", "Waybills and tracking."),
      M("cr_routes", "Routes", "Delivery routes."),
      M("cr_invoicing", "Invoicing", "Consignee billing."),
    ],
    coa: [
      { account_code: "4100", account_name: "Freight Income", account_type: "revenue" },
      { account_code: "5100", account_name: "Fuel & Delivery Cost", account_type: "expense" },
    ],
  },
  {
    id: "logistics", label: "Logistics", emoji: "🚛", tagline: "Warehousing plus transport.",
    modules: [
      M("lg_warehouse", "Warehousing", "Inbound / outbound."),
      M("lg_transport", "Transport", "Fleet operations."),
    ],
    coa: [
      { account_code: "4100", account_name: "Warehousing Income", account_type: "revenue" },
      { account_code: "4110", account_name: "Transport Income", account_type: "revenue" },
    ],
  },
  {
    id: "mining", label: "Mining", emoji: "⛏️", tagline: "Production, royalties, equipment.",
    modules: [
      M("mn_production", "Production", "Extraction records."),
      M("mn_equipment", "Equipment", "Heavy equipment."),
      M("mn_royalties", "Royalties", "Royalty computation."),
    ],
    coa: [
      { account_code: "4100", account_name: "Mineral Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Mining Royalties", account_type: "expense" },
      { account_code: "5110", account_name: "Equipment Fuel", account_type: "expense" },
    ],
  },
  {
    id: "security", label: "Security Company", emoji: "🛡️", tagline: "Guards, sites, deployments.",
    modules: [
      M("se_sites", "Sites", "Guarded sites."),
      M("se_guards", "Guards", "Roster and deployment."),
      M("se_contracts", "Contracts", "Client contracts."),
    ],
    coa: [
      { account_code: "4100", account_name: "Guarding Income", account_type: "revenue" },
      { account_code: "5100", account_name: "Guard Wages", account_type: "expense" },
    ],
  },
  {
    id: "wholesale", label: "Wholesaler / Distributor", emoji: "📦", tagline: "Bulk sales, agents, routes.",
    modules: [
      M("wh_inventory", "Inventory", "Warehouse stock."),
      M("wh_orders", "Orders", "Bulk orders."),
      M("wh_agents", "Sales Agents", "Agent routes."),
    ],
    coa: [
      { account_code: "4100", account_name: "Wholesale Sales", account_type: "revenue" },
      { account_code: "5100", account_name: "Cost of Goods Sold", account_type: "expense" },
      { account_code: "5110", account_name: "Agent Commissions", account_type: "expense" },
    ],
  },
];

export function getIndustry(id: string | null | undefined): Industry | undefined {
  if (!id) return undefined;
  return INDUSTRIES.find(i => i.id === id);
}
