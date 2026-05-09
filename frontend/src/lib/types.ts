export interface ResolvedLocation {
  source_input: string;
  location_name: string;
  latitude: number;
  longitude: number;
  country?: string;
  state?: string;
  approximate?: boolean;
}

export interface WeatherSummary {
  temperature?: number;
  feels_like?: number;
  condition: string;
  description: string;
  humidity?: number;
  wind_speed?: number;
  sunrise?: string;
  sunset?: string;
  local_time?: string;
  summary: string;
}

export interface HourlyForecast {
  forecast_time: string;
  temperature?: number;
  feels_like?: number;
  condition: string;
  description: string;
  humidity?: number;
  wind_speed?: number;
  precipitation_chance?: number;
  icon?: string;
}

export interface MinutelyForecast {
  forecast_time: string;
  precipitation?: number;
}

export interface ForecastDay {
  date: string;
  high?: number;
  low?: number;
  condition: string;
  description: string;
  precipitation_chance?: number;
  icon?: string;
}

export interface WeatherAlert {
  sender_name?: string | null;
  event: string;
  start?: string | null;
  end?: string | null;
  description?: string | null;
  tags: string[];
}

export interface OneCallWeatherResponse {
  location: ResolvedLocation;
  timezone?: string | null;
  timezone_offset?: number | null;
  current: WeatherSummary;
  minutely: MinutelyForecast[];
  hourly: HourlyForecast[];
  daily: ForecastDay[];
  alerts: WeatherAlert[];
  generated_image_url?: string | null;
  raw?: Record<string, unknown>;
}

export interface WeatherHistoryRead {
  id: number;
  source_input: string;
  location_name: string;
  country: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  current_weather: Record<string, unknown>;
  forecast: Record<string, unknown>;
  date_range_weather: Record<string, unknown>;
  summary: string;
  generated_image_url: string | null;
  note: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedLocationRead {
  id: number;
  source_input: string;
  location_name: string;
  country: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  tag: string;
  created_at: string;
  updated_at: string;
}

export interface NearbyPlace {
  name: string;
  rating?: number;
  address?: string;
  open_now?: boolean;
  google_maps_url?: string;
}

export interface NearbyPlacesResponse {
  configured: boolean;
  approximate: boolean;
  results: NearbyPlace[];
  message?: string;
}

export interface WeatherOverviewResponse {
  summary: string;
}

export interface WeatherBackgroundResponse {
  generated_image_url: string | null;
}

export interface WeatherQuestionResponse {
  configured: boolean;
  answer: string;
}
