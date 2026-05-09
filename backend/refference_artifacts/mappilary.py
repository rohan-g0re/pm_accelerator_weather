import requests
import os
import sys
from pathlib import Path

# ─────────────────────────────────────────────
# CONFIG — Replace with your Mapillary token
# Get one free at: https://www.mapillary.com/developer
# ─────────────────────────────────────────────
MAPILLARY_TOKEN = os.getenv("MAPILLARY_TOKEN", "")

def pincode_to_bbox(pincode: str, country: str = "US", delta: float = 0.005):
    """Use Nominatim (free, no key) to convert pincode → bounding box."""
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"postalcode": pincode, "country": country, "format": "json"},
        headers={"User-Agent": "MapillaryStreetViewFetcher/1.0"},
        timeout=10
    )
    results = resp.json()
    if not results:
        raise ValueError(f"Could not geocode pincode: {pincode}")
    
    lat = float(results[0]["lat"])
    lon = float(results[0]["lon"])
    print(f"[+] Pincode {pincode} → lat={lat}, lon={lon}")

    bbox = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"
    return lat, lon, bbox


def fetch_mapillary_images(bbox: str, limit: int = 5):
    """Fetch images from Mapillary v4 API using bounding box."""
    if not MAPILLARY_TOKEN:
        raise RuntimeError("MAPILLARY_TOKEN environment variable is required")
    resp = requests.get(
        "https://graph.mapillary.com/images",
        params={
            "access_token": MAPILLARY_TOKEN,
            "fields": "id,thumb_1024_url,captured_at,geometry",
            "bbox": bbox,
            "limit": limit
        },
        timeout=15
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Mapillary API error {resp.status_code}: {resp.text}")
    
    data = resp.json().get("data", [])
    print(f"[+] Found {len(data)} image(s) from Mapillary")
    return data


def download_image(url: str, filename: str):
    """Download image from a URL and save to disk."""
    resp = requests.get(url, timeout=30)
    if resp.status_code == 200:
        with open(filename, "wb") as f:
            f.write(resp.content)
        print(f"[✓] Saved: {filename}")
    else:
        print(f"[✗] Failed to download: {url} (status {resp.status_code})")


def main():
    pincode = input("Enter pincode/ZIP code: ").strip()
    country = input("Enter country code (default: US): ").strip() or "US"
    
    output_dir = Path(f"street_view_{pincode}")
    output_dir.mkdir(exist_ok=True)

    print(f"\n[→] Geocoding {pincode}...")
    lat, lon, bbox = pincode_to_bbox(pincode, country)

    print(f"[→] Fetching Mapillary images for bbox: {bbox}...")
    images = fetch_mapillary_images(bbox, limit=5)

    if not images:
        print("[!] No images found. Try increasing delta or a different pincode.")
        return

    print(f"\n[→] Downloading {len(images)} image(s) to ./{output_dir}/\n")
    for i, img in enumerate(images):
        img_id   = img["id"]
        img_url  = img.get("thumb_1024_url")
        captured = img.get("captured_at", "unknown")
        coords   = img.get("geometry", {}).get("coordinates", [])

        print(f"  Image {i+1}: ID={img_id}, captured_at={captured}, coords={coords}")

        if img_url:
            filename = output_dir / f"{img_id}.jpg"
            download_image(img_url, str(filename))
        else:
            print(f"  [!] No thumbnail URL for image {img_id}")

    print(f"\n[✓] Done! Images saved in: ./{output_dir}/")
    print(f"[i] View on Mapillary: https://www.mapillary.com/app/?lat={lat}&lng={lon}&z=16")


if __name__ == "__main__":
    main()
