export interface Closure {
  id: number;
  event_id: number;
  name: string;
  type: 'barrier' | 'segment' | 'zone';
  polygon: any; // GeoJSON Polygon
  center: any; // GeoJSON Point
  points: any; // JSONB - optional points data
  start_time: Date;
  end_time: Date;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ClosureCreate {
  event_id: number;
  name: string;
  type: 'barrier' | 'segment' | 'zone';
  polygon: any;
  points?: any;
  start_time: Date;
  end_time: Date;
  description?: string;
}

export interface ClosureUpdate {
  name?: string;
  polygon?: any;
  points?: any;
  start_time?: Date;
  end_time?: Date;
  description?: string;
}

export interface ClosurePublic {
  id: number;
  name: string;
  type: 'barrier' | 'segment' | 'zone';
  polygon: any;
  center: any;
  start_time: Date;
  end_time: Date;
  description?: string;
}
