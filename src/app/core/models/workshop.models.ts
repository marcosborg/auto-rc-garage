export interface MobileUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface RepairListItem {
  id: number;
  vehicle_id: number;
  vehicle_label: string;
  state: string;
  repair_state_id: number | null;
  is_open: boolean;
  timestamp: string | null;
  repair_started_at: string | null;
  repair_finished_at: string | null;
  repair_duration_minutes: number | null;
}

export interface RepairState {
  id: number;
  name: string;
}

export interface RepairPart {
  id: number;
  supplier: string | null;
  invoice_number: string | null;
  part_date: string | null;
  part_name: string;
  amount: number;
}

export interface RepairWorkLog {
  id: number;
  user_id: number;
  user_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number;
}

export interface RepairMedia {
  id: number;
  url: string;
  thumb: string;
}

export interface RepairChecklistItem {
  key: string;
  label: string;
  group: string;
  checked: boolean;
  note: string | null;
}

export interface RepairHistoryItem {
  id: number;
  opened_at: string | null;
  state: string;
  expected_completion_date: string | null;
  checklist_percentage: number;
  is_current: boolean;
}

export interface MechanicTotal {
  user_id: number;
  name: string;
  minutes: number;
}

export interface RepairDetail {
  id: number;
  vehicle: {
    id: number;
    license: string | null;
    foreign_license: string | null;
    brand: string | null;
    model: string | null;
    version: string | null;
    transmission: string | null;
    engine_displacement: string | null;
    year: number | null;
    month: string | null;
    license_date: string | null;
    color: string | null;
    fuel: string | null;
    kilometers: number | null;
    inspec_b: string | null;
    general_state: string | null;
    initial_photos: RepairMedia[];
  };
  name: string | null;
  kilometers: number | null;
  obs_1: string | null;
  obs_2: string | null;
  checklist_percentage: number;
  checklist: RepairChecklistItem[];
  repair_state_id: number | null;
  repair_state: string;
  timestamp: string | null;
  repair_started_at: string | null;
  repair_finished_at: string | null;
  repair_duration_minutes: number | null;
  work_performed: string | null;
  materials_used: string | null;
  expected_completion_date: string | null;
  checkin_photos: RepairMedia[];
  checkout_photos: RepairMedia[];
  parts: RepairPart[];
  parts_total: number;
  work_logs: RepairWorkLog[];
  work_total_minutes: number;
  mechanic_totals: MechanicTotal[];
  can_create_new_intervention: boolean;
  vehicle_repairs: RepairHistoryItem[];
}

export interface VehicleLookup {
  id: number;
  license: string | null;
  foreign_license: string | null;
  brand: string | null;
  model: string | null;
}
