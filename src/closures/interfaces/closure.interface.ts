export interface Closure {
  id: number;
  event_id: number;
  type: 'barrier' | 'segment' | 'zone';
  polygon: any; // GeoJSON Polygon
  center: any; // GeoJSON Point
  points: any; // JSONB - optional points data
  start_time: Date;
  end_time: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ClosureCreate {
  event_id: number;
  type: 'barrier' | 'segment' | 'zone';
  polygon: any;
  points?: any;
  start_time: Date;
  end_time: Date;
}

export interface ClosureUpdate {
  polygon?: any;
  points?: any;
  start_time?: Date;
  end_time?: Date;
}

export interface ClosurePublic {
  id: number;
  type: 'barrier' | 'segment' | 'zone';
  polygon: any;
  center: any;
  start_time: Date;
  end_time: Date;
}
