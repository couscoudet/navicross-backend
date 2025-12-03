export interface RouteRequest {
  origin: [number, number]; // [lng, lat]
  destination: [number, number]; // [lng, lat]
  profile: 'driving' | 'walking' | 'cycling' | 'foot';
  eventSlug?: string;
}

export interface RouteStep {
  distance: number; // meters
  duration: number; // seconds
  instruction: string;
  name?: string;
}

export interface RouteResponse {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  steps: RouteStep[];
  warnings: string[];
  routing_engine: string;
}

export interface OSRMResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    legs: Array<{
      steps: Array<{
        distance: number;
        duration: number;
        name: string;
        maneuver: {
          type: string;
          instruction: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
}

export interface ValhallaRequest {
  locations: Array<{ lat: number; lon: number }>;
  costing: string;
  exclude_polygons?: number[][][]; // Array of polygon coordinates
}

export interface ValhallaResponse {
  trip: {
    summary: {
      length: number; // kilometers
      time: number; // seconds
    };
    legs: Array<{
      shape: string; // encoded polyline
      maneuvers: Array<{
        instruction: string;
        length: number;
        time: number;
        type: number;
        street_names?: string[];
      }>;
    }>;
  };
}
