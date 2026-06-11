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
  cover_photo: RepairMedia | null;
  vehicle?: {
    initial_photos?: RepairMedia[];
  };
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
  amount: number | null;
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
  data_url?: string;
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

export interface PartOrderHistoryItem {
  id: number;
  repair_id: number | null;
  supplier: string | null;
  status: string;
  status_label: string;
  received_badge: 'chegou' | 'parcial' | 'pendente' | 'atrasado';
  priority: 'low' | 'normal' | 'urgent';
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  items_count: number;
  items_summary: string;
}

export interface MechanicTotal {
  user_id: number;
  name: string;
  minutes: number;
}

export interface RepairDetail {
  id: number;
  work_type: RepairWorkType;
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
  kilometers_out: number | null;
  fuel_level_in_percentage: number | null;
  fuel_level_percentage: number | null;
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
  receptionist_signature: RepairMedia | null;
  client_signature: RepairMedia | null;
  parts: RepairPart[];
  parts_total: number;
  work_logs: RepairWorkLog[];
  work_total_minutes: number;
  mechanic_totals: MechanicTotal[];
  can_create_new_intervention: boolean;
  vehicle_repairs: RepairHistoryItem[];
  part_orders: PartOrderHistoryItem[];
}

export interface VehicleLookup {
  id: number;
  license: string | null;
  foreign_license: string | null;
  brand: string | null;
  model: string | null;
  cover_photo: RepairMedia | null;
}

export type RepairWorkType = 'workshop' | 'painting';

export type PlanningInterventionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface PlanningInterventionType {
  id: number;
  name: string;
  is_active: boolean;
}

export interface PlanningMechanic {
  id: number;
  name: string;
  email?: string | null;
}

export interface PlanningWorkLog {
  id: number;
  user_id: number;
  user_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number;
}

export interface PlanningIntervention {
  id: number;
  repair_id: number;
  vehicle: {
    id: number;
    license: string | null;
  };
  type: {
    id: number;
    name: string;
  };
  title: string;
  description: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  status: PlanningInterventionStatus;
  status_label: string;
  mechanics: PlanningMechanic[];
  work_logs: PlanningWorkLog[];
  my_work_in_progress: boolean;
  completed_at: string | null;
}

export interface GarageVehicleRepair {
  id: number;
  state: string;
  is_open: boolean;
  timestamp: string | null;
  repair_started_at: string | null;
  repair_finished_at: string | null;
  repair_duration_minutes: number | null;
  checklist_percentage: number;
}

export interface GarageVehicle {
  id: number;
  license: string | null;
  foreign_license: string | null;
  brand: string | null;
  model: string | null;
  kilometers: number | null;
  cover_photo: RepairMedia | null;
  repairs: GarageVehicleRepair[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PartOrderItem {
  id?: number;
  reference: string | null;
  description: string;
  quantity: number;
  status?: string;
  observations?: string | null;
}

export interface PartOrder {
  id: number;
  repair_id: number | null;
  vehicle_id: number | null;
  vehicle_label: string | null;
  supplier: string | null;
  priority: 'low' | 'normal' | 'urgent';
  status: string;
  status_label: string;
  requested_delivery_days: number | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  notes: string | null;
  created_at: string | null;
  items: PartOrderItem[];
  received_badge: 'chegou' | 'parcial' | 'pendente' | 'atrasado';
}

export interface PartOrderSupplier {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  nif?: string | null;
}
