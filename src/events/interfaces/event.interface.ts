export interface Event {
  id: number;
  slug: string;
  name: string;
  event_date: Date;
  route: any; // GeoJSON LineString
  description: string | null;
  published: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface EventCreate {
  slug: string;
  name: string;
  event_date: Date;
  route?: any;
  description?: string;
  created_by: string;
}

export interface EventUpdate {
  name?: string;
  event_date?: Date;
  route?: any;
  description?: string;
  published?: boolean;
}

export interface EventPublic {
  id: number;
  slug: string;
  name: string;
  event_date: Date;
  published: boolean;
}
