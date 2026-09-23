-- Local/offline schema for cashier ID authentication, property management and school operations
ALTER TABLE employee_pos_permissions ADD COLUMN cashier_code TEXT;
ALTER TABLE employee_pos_permissions ADD COLUMN display_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_pos_cashier_code ON employee_pos_permissions(cashier_code);

CREATE TABLE IF NOT EXISTS property_assets (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL,
 property_type TEXT NOT NULL DEFAULT 'apartment_block', address TEXT, city TEXT, units_count INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS property_units (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, property_id TEXT NOT NULL, unit_code TEXT NOT NULL,
 unit_type TEXT NOT NULL DEFAULT 'apartment', floor TEXT, bedrooms INTEGER NOT NULL DEFAULT 0, beds INTEGER NOT NULL DEFAULT 1,
 monthly_rent REAL NOT NULL DEFAULT 0, daily_rate REAL NOT NULL DEFAULT 0, deposit_required REAL NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'vacant', active INTEGER NOT NULL DEFAULT 1, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(property_id,unit_code)
);
CREATE TABLE IF NOT EXISTS property_tenants (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, tenant_no TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT, email TEXT,
 id_number TEXT, emergency_contact TEXT, emergency_phone TEXT, notes TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,tenant_no)
);
CREATE TABLE IF NOT EXISTS property_leases (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, lease_no TEXT NOT NULL, unit_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
 lease_type TEXT NOT NULL DEFAULT 'monthly', start_date TEXT NOT NULL, end_date TEXT, rent_amount REAL NOT NULL DEFAULT 0, deposit_amount REAL NOT NULL DEFAULT 0,
 billing_day INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,lease_no)
);
CREATE TABLE IF NOT EXISTS property_charges (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, lease_id TEXT NOT NULL, charge_date TEXT NOT NULL DEFAULT CURRENT_DATE, due_date TEXT NOT NULL DEFAULT CURRENT_DATE,
 charge_type TEXT NOT NULL DEFAULT 'rent', description TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, paid_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS property_payments (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, lease_id TEXT, tenant_id TEXT, payment_no TEXT NOT NULL, payment_date TEXT NOT NULL DEFAULT CURRENT_DATE,
 amount REAL NOT NULL DEFAULT 0, method TEXT NOT NULL DEFAULT 'cash', reference TEXT, allocation_notes TEXT, status TEXT NOT NULL DEFAULT 'posted', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,payment_no)
);
CREATE TABLE IF NOT EXISTS property_bookings (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, unit_id TEXT NOT NULL, guest_name TEXT NOT NULL, phone TEXT, check_in TEXT NOT NULL, check_out TEXT NOT NULL,
 nightly_rate REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'reserved', notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS property_maintenance (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, property_id TEXT, unit_id TEXT, title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'medium',
 status TEXT NOT NULL DEFAULT 'open', description TEXT, estimated_cost REAL NOT NULL DEFAULT 0, actual_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS property_meter_readings (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, unit_id TEXT NOT NULL, meter_type TEXT NOT NULL, reading_date TEXT NOT NULL DEFAULT CURRENT_DATE,
 reading REAL NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_boarding_houses (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, gender TEXT, capacity INTEGER NOT NULL DEFAULT 0, house_parent TEXT, active INTEGER NOT NULL DEFAULT 1, UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS school_boarding_beds (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, house_id TEXT NOT NULL, bed_code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'vacant'
);
CREATE TABLE IF NOT EXISTS school_boarding_allocations (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, student_id TEXT NOT NULL, bed_id TEXT NOT NULL, start_date TEXT NOT NULL DEFAULT CURRENT_DATE, end_date TEXT, status TEXT NOT NULL DEFAULT 'active', notes TEXT
);
CREATE TABLE IF NOT EXISTS school_discipline_incidents (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, student_id TEXT NOT NULL, incident_date TEXT NOT NULL DEFAULT CURRENT_DATE, category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'low', description TEXT, action_taken TEXT, status TEXT NOT NULL DEFAULT 'open', resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS school_health_visits (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, student_id TEXT NOT NULL, visit_date TEXT NOT NULL DEFAULT CURRENT_DATE, complaint TEXT, treatment TEXT, referred INTEGER NOT NULL DEFAULT 0, notes TEXT
);
CREATE TABLE IF NOT EXISTS school_library_books (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, isbn TEXT, title TEXT NOT NULL, author TEXT, category TEXT, copies INTEGER NOT NULL DEFAULT 1, available_copies INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS school_library_loans (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, book_id TEXT NOT NULL, student_id TEXT NOT NULL, issued_date TEXT NOT NULL DEFAULT CURRENT_DATE, due_date TEXT, returned_date TEXT, status TEXT NOT NULL DEFAULT 'issued'
);
CREATE TABLE IF NOT EXISTS school_transport_routes (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, vehicle_no TEXT, driver_name TEXT, driver_phone TEXT, capacity INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS school_transport_allocations (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, route_id TEXT NOT NULL, student_id TEXT NOT NULL, pickup_point TEXT, status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS school_communications (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL, audience TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, sent_at TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);