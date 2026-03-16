"""
Shared database helpers for rental scrapers.

Uses Supabase client (same database as lucid-rents) to match/create
buildings and upsert rents, amenities, and listings.

Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone


# ── ENV ──────────────────────────────────────────────────────────────────────
def load_env():
    """Load env vars from .env.local in project root."""
    for env_file in [".env.local", ".env"]:
        env_path = Path(__file__).parent.parent / env_file
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'").replace("\\n", "")
                    if key not in os.environ:
                        os.environ[key] = val


load_env()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

from supabase import create_client

_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SERVICE_KEY:
            print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
            sys.exit(1)
        _supabase = create_client(SUPABASE_URL, SERVICE_KEY)
    return _supabase


# ── AMENITY CATEGORIZATION ──────────────────────────────────────────────────
AMENITY_CATEGORIES = {
    "doorman": "building", "concierge": "building", "elevator": "building",
    "live-in super": "building", "superintendent": "building", "lobby": "building",
    "package room": "building", "mail room": "building", "common area": "building",
    "community room": "building", "residents lounge": "building", "lounge": "building",
    "co-working": "building", "coworking": "building", "business center": "building",
    "media room": "building", "game room": "building", "playroom": "building",
    "children's playroom": "building", "library": "building", "wi-fi": "building",
    "wifi": "building", "virtual doorman": "building", "intercom": "building",
    "wheelchair accessible": "building", "ada accessible": "building",
    "smoke free": "building", "no smoking": "building",
    "air conditioning": "building", "a/c": "building", "central air": "building",
    "dishwasher": "building", "microwave": "building", "stainless steel": "building",
    "hardwood": "building", "hardwood flooring": "building",
    "high ceilings": "building", "walk-in closet": "building",
    "controlled access": "building", "gated": "building",
    "roof deck": "outdoor", "rooftop": "outdoor", "terrace": "outdoor",
    "balcony": "outdoor", "patio": "outdoor", "garden": "outdoor",
    "courtyard": "outdoor", "backyard": "outdoor", "outdoor space": "outdoor",
    "bbq": "outdoor", "grill": "outdoor", "sun deck": "outdoor", "pool": "outdoor",
    "swimming pool": "outdoor",
    "gym": "fitness", "fitness center": "fitness", "fitness room": "fitness",
    "yoga studio": "fitness", "yoga room": "fitness", "sauna": "fitness",
    "spa": "fitness", "steam room": "fitness", "basketball court": "fitness",
    "tennis court": "fitness", "rock climbing": "fitness",
    "parking": "parking", "garage": "parking", "bike room": "parking",
    "bike storage": "parking", "bicycle storage": "parking",
    "valet parking": "parking", "ev charging": "parking",
    "laundry in unit": "laundry", "washer/dryer": "laundry",
    "in-unit laundry": "laundry", "laundry room": "laundry",
    "laundry in building": "laundry", "washer dryer": "laundry",
    "washer and dryer": "laundry",
    "security": "security", "video intercom": "security",
    "surveillance": "security", "key fob": "security", "cctv": "security",
    "security camera": "security", "24-hour security": "security",
    "pet friendly": "pet", "pets allowed": "pet", "dog friendly": "pet",
    "cat friendly": "pet", "pet spa": "pet", "dog run": "pet",
    "dog grooming": "pet", "pet grooming": "pet",
    "storage": "storage", "storage room": "storage", "private storage": "storage",
    "wine storage": "storage", "cellar": "storage",
    "penthouse": "luxury", "private terrace": "luxury",
    "screening room": "luxury", "wine cellar": "luxury",
    "golf simulator": "luxury", "bowling alley": "luxury",
    "private dining": "luxury", "chef's kitchen": "luxury",
}


def categorize_amenity(text: str) -> str:
    lower = text.lower().strip()
    for keyword, category in AMENITY_CATEGORIES.items():
        if keyword in lower:
            return category
    return "other"


def normalize_amenity(text: str) -> str:
    return " ".join(w.capitalize() for w in text.strip().split())


# ── ADDRESS NORMALIZATION ────────────────────────────────────────────────────
STREET_ABBREVS = {
    "street": "ST", "st": "ST",
    "avenue": "AVE", "ave": "AVE", "av": "AVE",
    "boulevard": "BLVD", "blvd": "BLVD",
    "drive": "DR", "dr": "DR",
    "place": "PL", "pl": "PL",
    "road": "RD", "rd": "RD",
    "lane": "LN", "ln": "LN",
    "court": "CT", "ct": "CT",
    "terrace": "TER", "ter": "TER",
    "circle": "CIR", "cir": "CIR",
    "way": "WAY",
    "north": "N", "south": "S", "east": "E", "west": "W",
}


def normalize_address(address: str) -> str:
    addr = address.upper().strip()
    for sep in [" APT ", " UNIT ", " #", " STE "]:
        if sep in addr:
            addr = addr.split(sep)[0]
    parts = addr.split()
    normalized = []
    for part in parts:
        lower = part.lower().rstrip(".,")
        if lower in STREET_ABBREVS:
            normalized.append(STREET_ABBREVS[lower])
        else:
            normalized.append(part.rstrip(".,"))
    return " ".join(normalized)


# ── BOROUGH DETECTION ────────────────────────────────────────────────────────
CITY_TO_BOROUGH = {
    "new york": "Manhattan", "manhattan": "Manhattan",
    "brooklyn": "Brooklyn", "bronx": "Bronx",
    "queens": "Queens", "staten island": "Staten Island",
    "long island city": "Queens", "astoria": "Queens",
    "flushing": "Queens", "jamaica": "Queens",
    "jackson heights": "Queens", "woodside": "Queens",
    "sunnyside": "Queens", "forest hills": "Queens",
    "rego park": "Queens", "arverne": "Queens",
    "far rockaway": "Queens", "woodhaven": "Queens",
    "ridgewood": "Queens", "bayside": "Queens",
    "elmhurst": "Queens", "corona": "Queens",
    "kew gardens": "Queens", "ozone park": "Queens",
    "howard beach": "Queens", "fresh meadows": "Queens",
    "whitestone": "Queens", "college point": "Queens",
    "maspeth": "Queens", "middle village": "Queens",
    "glendale": "Queens", "east elmhurst": "Queens",
    "south ozone park": "Queens", "south richmond hill": "Queens",
    "richmond hill": "Queens", "springfield gardens": "Queens",
    "laurelton": "Queens", "rosedale": "Queens",
    "cambria heights": "Queens", "st. albans": "Queens",
    "hollis": "Queens", "floral park": "Queens",
    "little neck": "Queens", "douglaston": "Queens",
    "glen oaks": "Queens", "bellerose": "Queens",
    "briarwood": "Queens",
}


def detect_borough_from_city(city: str) -> str | None:
    city_lower = city.strip().lower()
    return CITY_TO_BOROUGH.get(city_lower)


def detect_borough_from_zip(zip_code: str) -> str:
    if zip_code.startswith("100") or zip_code.startswith("101") or zip_code.startswith("102"):
        return "Manhattan"
    if zip_code.startswith("112") or zip_code.startswith("113") or zip_code.startswith("114"):
        return "Brooklyn"
    if zip_code.startswith("104"):
        return "Bronx"
    if zip_code.startswith("110") or zip_code.startswith("111") or zip_code.startswith("116"):
        return "Queens"
    if zip_code.startswith("103"):
        return "Staten Island"
    return "Manhattan"


def generate_slug(full_address: str) -> str:
    return re.sub(r'(^-+|-+$)', '', re.sub(r'[^a-z0-9]+', '-', full_address.lower()))


# ── DATABASE OPERATIONS (Supabase) ──────────────────────────────────────────
def match_building(street: str, zip_code: str, borough: str = "") -> str | None:
    """Try to match a listing to an existing building by normalized address + zip."""
    if not street:
        return None

    normalized = normalize_address(street)

    if zip_code:
        result = get_supabase().table("buildings") \
            .select("id") \
            .eq("zip_code", zip_code) \
            .ilike("full_address", f"%{normalized}%") \
            .limit(1) \
            .execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]

        # Try house number match
        parts = normalized.split()
        if len(parts) >= 2:
            result = get_supabase().table("buildings") \
                .select("id") \
                .eq("zip_code", zip_code) \
                .eq("house_number", parts[0]) \
                .limit(1) \
                .execute()
            if result.data and len(result.data) > 0:
                return result.data[0]["id"]

    if borough:
        result = get_supabase().table("buildings") \
            .select("id") \
            .eq("borough", borough) \
            .ilike("full_address", f"%{normalized}%") \
            .limit(1) \
            .execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]

    return None


def create_building(street: str, borough: str, zip_code: str,
                    latitude: float = None, longitude: float = None) -> str | None:
    """Create a new building record. Returns building ID."""
    parts = street.upper().split(None, 1)
    house_number = parts[0] if parts else ""
    street_name = parts[1] if len(parts) > 1 else ""

    full_address = f"{street.upper()}, {borough}, NY"
    if zip_code:
        full_address += f", {zip_code}"

    slug = generate_slug(full_address)

    row = {
        "full_address": full_address,
        "house_number": house_number,
        "street_name": street_name,
        "borough": borough,
        "city": "New York",
        "state": "NY",
        "zip_code": zip_code or None,
        "slug": slug,
        "latitude": latitude,
        "longitude": longitude,
        "overall_score": 0,
        "review_count": 0,
        "violation_count": 0,
        "complaint_count": 0,
        "litigation_count": 0,
        "dob_violation_count": 0,
        "crime_count": 0,
        "bedbug_report_count": 0,
        "eviction_count": 0,
        "permit_count": 0,
        "sidewalk_shed_count": 0,
        "lead_violation_count": 0,
    }

    try:
        result = get_supabase().table("buildings").insert(row).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]
    except Exception as e:
        err_msg = str(e)
        if "duplicate" in err_msg.lower() or "unique" in err_msg.lower():
            existing = get_supabase().table("buildings") \
                .select("id") \
                .eq("slug", slug) \
                .limit(1) \
                .execute()
            if existing.data and len(existing.data) > 0:
                return existing.data[0]["id"]
        print(f"    Building creation error: {e}")
    return None


def upsert_rents(building_id: str, rent_by_beds: dict, source: str) -> int:
    """Upsert rent data for a building."""
    if not rent_by_beds:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for beds, data in rent_by_beds.items():
        if beds < 0:
            continue
        min_r = data["min_rent"]
        max_r = data["max_rent"]
        median = (min_r + max_r) // 2
        rows.append({
            "building_id": building_id,
            "source": source,
            "bedrooms": beds,
            "min_rent": min_r,
            "max_rent": max_r,
            "median_rent": median,
            "listing_count": 1,
            "scraped_at": now,
            "updated_at": now,
        })

    if not rows:
        return 0

    try:
        get_supabase().table("building_rents") \
            .upsert(rows, on_conflict="building_id,source,bedrooms") \
            .execute()
        return len(rows)
    except Exception as e:
        print(f"    Rent upsert error: {e}")
        return 0


def upsert_amenities(building_id: str, amenities: list[str], source: str) -> int:
    """Upsert amenity data for a building."""
    if not amenities:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    seen = set()
    for a in amenities:
        normalized = normalize_amenity(a)
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "building_id": building_id,
            "source": source,
            "amenity": normalized,
            "category": categorize_amenity(a),
            "scraped_at": now,
        })

    try:
        get_supabase().table("building_amenities") \
            .upsert(rows, on_conflict="building_id,source,amenity") \
            .execute()
        return len(rows)
    except Exception as e:
        print(f"    Amenity upsert error: {e}")
        return 0


def upsert_listing(building_id: str, listing: dict, source: str) -> bool:
    """Upsert full listing data into building_listings table."""
    now = datetime.now(timezone.utc).isoformat()

    row = {
        "building_id": building_id,
        "source": source,
        "listing_name": listing.get("listing_name"),
        "listing_url": listing.get("listing_url"),
        "property_type": listing.get("property_type"),
        "price_min": listing.get("price_min"),
        "price_max": listing.get("price_max"),
        "price_text": listing.get("price_text"),
        "bed_min": listing.get("bed_min"),
        "bed_max": listing.get("bed_max"),
        "bath_min": listing.get("bath_min"),
        "bath_max": listing.get("bath_max"),
        "sqft_min": listing.get("sqft_min"),
        "sqft_max": listing.get("sqft_max"),
        "bed_text": listing.get("bed_text"),
        "bath_text": listing.get("bath_text"),
        "sqft_text": listing.get("sqft_text"),
        "units_available": listing.get("units_available", 0),
        "units_available_text": listing.get("units_available_text"),
        "availability_status": listing.get("availability_status"),
        "management_company": listing.get("management_company"),
        "verified": listing.get("verified", False),
        "has_price_drops": listing.get("has_price_drops", False),
        "listing_views": listing.get("listing_views"),
        "updated_at_source": listing.get("updated_at_source"),
        "floor_plans": json.dumps(listing.get("floor_plans", [])),
        "bed_price_data": json.dumps(listing.get("bed_price_data", [])),
        "office_hours": json.dumps(listing.get("office_hours", [])),
        "scraped_at": now,
    }

    try:
        get_supabase().table("building_listings") \
            .upsert(row, on_conflict="building_id,source") \
            .execute()
        return True
    except Exception as e:
        print(f"    Listing upsert error: {e}")
        return False
