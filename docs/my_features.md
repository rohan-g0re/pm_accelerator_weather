# Weather App Feature List

This feature list is written to satisfy both the frontend and backend assessment criteria in `docs/task_sheet.md`.

## Core Weather Features

1. Users can search for weather by:
   - City or town name.
   - ZIP code or postal code.
   - GPS coordinates.
   - Browser/mobile current location.
   - Landmark or point-of-interest name when the geocoding API can resolve it.

2. The app validates locations before requesting weather:
   - If the location exists, the backend stores the normalized location name, latitude, longitude, country/state, and source input.
   - If the location is ambiguous, the frontend shows suggested matches for the user to choose from.
   - If the location cannot be resolved, the frontend shows a friendly error such as "Could not find the weather there."

3. The app displays current weather using real API data, not static information:
   - Temperature.
   - Feels-like temperature.
   - Weather condition.
   - Humidity.
   - Wind speed.
   - Sunrise and sunset.
   - Local time for the selected location.
   - Short weather summary.

4. Users can view weather for their current location:
   - The frontend requests browser geolocation permission.
   - The backend accepts latitude/longitude and resolves them to a readable location.
   - If permission is denied or unavailable, the frontend asks the user to enter a location manually.

5. The app includes a clear 5-day forecast:
   - Forecast cards show date, weather condition, high/low temperature, precipitation chance, and weather icon.
   - The forecast layout adapts for desktop, tablet, and mobile screens.

6. Weather icons, generated images, and background visuals are used to make the weather information easy to scan:
   - Weather icons represent rain, sun, clouds, storms, snow, mist, and other conditions.
   - The background changes based on local time and weather condition.
   - Generated location clipart is shown when available.

## Backend Features

1. Backend stack:
   - FastAPI.
   - PostgreSQL on Render.
   - OpenWeather API.
   - Google Maps or geocoding API.
   - Mapillary API.
   - DeepSeek API.
   - Nanobanana image generation API.

2. The backend exposes RESTful APIs for frontend communication:
   - `GET /weather/current` - get current weather for a location, ZIP/postal code, coordinates, or landmark.
   - `GET /weather/forecast` - get the 5-day forecast for a resolved location.
   - `POST /weather/history` - create a stored weather request for a location and date range.
   - `GET /weather/history` - read previously requested weather records.
   - `GET /weather/history/{id}` - read one stored weather record.
   - `PATCH /weather/history/{id}` - update editable fields on a stored weather record.
   - `DELETE /weather/history/{id}` - delete a stored weather record.
   - `POST /saved-locations` - save a resolved location to the user's library.
   - `GET /saved-locations` - list saved locations.
   - `PATCH /saved-locations/{id}` - update the saved-location tag.
   - `DELETE /saved-locations/{id}` - delete a saved location.
   - `GET /exports/history/{id}.csv` - export one stored weather record as CSV.
   - `GET /exports/history/{id}.pdf` - export one stored weather record as PDF.
   - `GET /places/nearby` - list nearby restaurants, hotels, or other points of interest through Google Maps.
   - `POST /weather/ask` - answer user questions about the selected day's weather using DeepSeek.

3. Weather data is retrieved from external APIs:
   - OpenWeather provides current weather and 5-day forecast.
   - A geocoding provider validates and normalizes user-entered locations.
   - Google Maps provides nearby hotels, restaurants, and approximate map data.
   - Mapillary provides street/location imagery when useful for generated clipart.
   - Nanobanana generates weather/location-themed clipart.
   - DeepSeek creates natural-language answers and export-ready summaries.

4. API error handling:
   - Invalid location returns a structured error response.
   - Failed OpenWeather request returns a structured error response.
   - Incomplete weather API response returns a structured error response.
   - Geolocation permission denial is handled on the frontend.
   - External API timeout or quota errors show a useful fallback message instead of crashing the UI.

## Database And CRUD Features

1. Database tables:
   - `weather_history`: stores requested location, date range, resolved coordinates, current weather, forecast data, summary, generated image URL, export metadata, and timestamps.
   - `saved_locations`: stores saved normalized locations, coordinates, editable tag, and timestamps.
   - `nearby_places_cache`: optionally stores nearby restaurant/hotel/map results for a location to reduce repeated API calls.

2. CREATE:
   - Users can enter a location and date range.
   - The backend validates the date range before requesting/storing data.
   - The backend validates that the location exists or returns fuzzy-match suggestions.
   - The backend retrieves weather data for the requested location/date range where the weather API supports it.
   - The backend stores the request and weather result in `weather_history`.
   - Users can also save a resolved location to the library in `saved_locations`.

3. READ:
   - Users can view previous weather requests stored in `weather_history`.
   - Users can open a stored record to see location, date range, current weather, forecast, summary, generated image, and export links.
   - Users can view saved locations from `saved_locations`.
   - Row-level security/user separation is not required for this assessment.

4. UPDATE:
   - Users can update the editable tag on a saved location.
   - Users can update editable notes or labels on a weather history record if included in the UI.
   - The backend validates tag length, allowed characters, and empty values.
   - Weather measurements from APIs are treated as source data and are not manually editable.

5. DELETE:
   - Users can delete saved locations.
   - Users can delete stored weather history records.

6. Date-range validation:
   - Start date is required.
   - End date is required.
   - End date cannot be before start date.
   - Date range must fit within the selected weather API's supported historical/forecast range.
   - Invalid ranges show a clear frontend error message.

## Saved Location Library

1. For every successful location search, users can click "Save to library."
2. Saved locations are stored in PostgreSQL.
3. Each saved location has an editable tag such as "home", "work", or "trip."
4. Tags are used as display names in the saved-location list.
5. Clicking a tag opens the actual resolved location name and weather details.
6. Tag validation:
   - Minimum 3 characters.
   - Maximum 40 characters.
   - No unsupported special characters.
   - Duplicate tags are allowed only if the underlying location is different, or the UI clearly disambiguates them.

## AI And Additional API Features

1. Generated clipart:
   - If the user enters a city, the app generates clipart directly from the city, weather, and local time.
   - If the user enters a ZIP/postal code or GPS coordinates, the backend retrieves city/location context first.
   - When useful, the backend retrieves street images through Mapillary and sends them to Nanobanana.
   - The generated image reflects the selected location, local time, and weather condition.

2. Weather Q&A:
   - Users can ask questions such as "Should I carry an umbrella?" or "Is this good weather for walking?"
   - The backend sends DeepSeek the current weather summary, forecast, and user question.
   - The app reuses the current session's weather summary instead of refetching it for every question.
   - API keys stay on the backend and are not exposed to the browser.

3. Nearby places:
   - Users can click "Restaurants near me" or "Hotels near me" for any resolved location.
   - Results come from Google Maps or another places API.
   - If a location is approximate, the UI clearly says results are approximate.

## Export Features

1. Users can export stored weather data from the database.
2. Supported export formats:
   - CSV for date-range weather/history records.
   - PDF for a designed weather report.

3. CSV export includes:
   - Location.
   - Date range.
   - Temperature values.
   - Weather conditions.
   - Humidity.
   - Wind speed.
   - Forecast rows when available.

4. PDF export includes:
   - Location.
   - Current weather.
   - Weather summary.
   - 5-day forecast.
   - Generated image centered near the beginning.
   - Nearby places if the user has requested them.

5. PDF generation flow:
   - Backend gathers the stored weather record from PostgreSQL.
   - DeepSeek can generate clean report HTML from the stored data.
   - Backend converts the HTML to PDF and returns it for download.

## Frontend Features

1. Frontend stack:
   - Next.js.
   - Deployed on Vercel.
   - No Python or Java frontend framework.

2. Responsive design:
   - The app adapts across desktop, tablet, and smartphone screens.
   - Desktop UI follows `frontend/refference_assets/desktop weather.jpg`.
   - Mobile UI follows `frontend/refference_assets/mobile weather.jpg` while keeping the desktop color scheme.
   - Desktop and mobile can use different layouts, but they expose the same core actions.

3. Frontend views:
   - Search/current weather view.
   - Current-location weather view.
   - 5-day forecast view.
   - Saved-location library view.
   - Weather history/date-range view.
   - Export controls.
   - Weather Q&A panel.
   - Nearby restaurants/hotels panel.

4. Frontend error states:
   - City/location not found.
   - API request failed.
   - Incomplete weather response.
   - Invalid date range.
   - Geolocation permission denied.
   - Export generation failed.

5. Frontend loading states:
   - Weather search loading.
   - Forecast loading.
   - Generated image loading.
   - Export generation loading.
   - Nearby places loading.
   - AI answer loading.

6. UI details:
   - Current weather is shown in a clear summary tile.
   - Forecast is shown as organized cards or rows.
   - Saved locations use editable tags.
   - Background gradient changes based on local time and weather condition.
   - Nanobanana-generated background or clipart appears when available.

## Submission Requirements

1. The GitHub repository must be public and open-source before submission, or private with collaborator access granted to the required evaluator accounts.
2. The repository must allow clone/download access.
3. A README must explain:
   - What the app does.
   - Tech stack.
   - API integrations.
   - Setup instructions.
   - Environment variables.
   - How to run backend and frontend locally.
   - How CRUD, exports, forecast, and error handling are implemented.

4. A requirements/dependency file must be included:
   - Backend: `requirements.txt`, `pyproject.toml`, or equivalent.
   - Frontend: `package.json`.

5. A short demo video must be prepared:
   - 1-2 minutes.
   - Shows the running app.
   - Explains the code structure.
   - Demonstrates current weather, forecast, CRUD, export, and at least one error case.

6. The app must include:
   - My name.
   - An informational section describing Product Manager Accelerator using the company's LinkedIn description as the source.

## Assessment Criteria Coverage

1. Frontend location input: covered by city, ZIP/postal code, coordinates, current location, and landmarks.
2. Frontend current weather display: covered by current weather summary tile and detailed weather fields.
3. Frontend current-location weather: covered by browser/mobile geolocation support.
4. Frontend icons/images: covered by weather icons, dynamic backgrounds, and Nanobanana clipart.
5. Frontend responsive design: covered by desktop, tablet, and mobile layouts.
6. Frontend 5-day forecast: covered by forecast cards/rows.
7. Frontend error handling: covered by invalid location, API failure, incomplete response, geolocation denial, invalid date range, and export failure.
8. Backend CRUD CREATE: covered by storing location/date-range weather requests and saved locations.
9. Backend CRUD READ: covered by reading weather history and saved locations.
10. Backend CRUD UPDATE: covered by updating saved-location tags and optional history notes/labels.
11. Backend CRUD DELETE: covered by deleting saved locations and weather history.
12. Backend validation: covered by date-range validation and location validation/fuzzy matching.
13. Backend REST APIs: covered by FastAPI endpoint list.
14. Additional API integration: covered by Google Maps, Mapillary, DeepSeek, and Nanobanana.
15. Data export: covered by CSV and PDF exports from stored database records.
16. Submission requirements: covered by README, dependency files, repository access, demo video, name, and PM Accelerator information section.
