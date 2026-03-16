"""
Shared database helpers for rental scrapers.

Reads DATABASE_URL from .env (Prisma-style) and provides functions
to match/create buildings and upsert rents, amenities, and listings
using psycopg2 against the same PostgreSQL database Prisma manages.
"""

import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras


# ── ENV ──────────────────────────────────────────────────────────────────────
def load_env():
    """Load DATABASE_URL from .env file in project root."""
    for env_file in [".env", ".env.local"]:
        env_path = Path(__file__).parent.parent / env_file
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key not in os.environ:
                        os.environ[key] = val


load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: Missing DATABASE_URL in .env or environment")
    sys.exit(1)


def get_conn():
    """Get a psycopg2 connection."""
    return psycopg2.connect(DATABASE_URL)


# ── CUID-LIKE ID GENERATION ─────────────────────────────────────────────────
import random
import string
import time as _time

_COUNTER = random.randint(0, 0xFFFFFF)


def cuid():
    """Generate a cuid-like ID compatible with Prisma's @default(cuid())."""
    global _COUNTER
    _COUNTER = (_COUNTER + 1) & 0xFFFFFF
    ts = hex(int(_time.time() * 1000))[2:]
    count = hex(_COUNTER)[2:].zfill(6)
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"c{ts}{count}{rand}"


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
    "new york": "Manhattan",
    "manhattan": "Manhattan",
    "brooklyn": "Brooklyn",
    "bronx": "Bronx",
    "queens": "Queens",
    "long island city": "Queens",
    "astoria": "Queens",
    "flushing": "Queens",
    "jamaica": "Queens",
    "jackson heights": "Queens",
    "woodside": "Queens",
    "sunnyside": "Queens",
    "forest hills": "Queens",
    "rego park": "Queens",
    "staten island": "Staten Island",
    "arverne": "Queens",
    "far rockaway": "Queens",
    "woodhaven": "Queens",
    "ridgewood": "Queens",
    "bayside": "Queens",
    "elmhurst": "Queens",
    "corona": "Queens",
    "kew gardens": "Queens",
    "ozone park": "Queens",
    "howard beach": "Queens",
    "fresh meadows": "Queens",
    "whitestone": "Queens",
    "college point": "Queens",
    "maspeth": "Queens",
    "middle village": "Queens",
    "glendale": "Queens",
    "east elmhurst": "Queens",
    "south ozone park": "Queens",
    "south richmond hill": "Queens",
    "richmond hill": "Queens",
    "springfield gardens": "Queens",
    "laurelton": "Queens",
    "rosedale": "Queens",
    "cambria heights": "Queens",
    "st. albans": "Queens",
    "hollis": "Queens",
    "floral park": "Queens",
    "little neck": "Queens",
    "douglaston": "Queens",
    "glen oaks": "Queens",
    "bellerose": "Queens",
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


# ── DATABASE OPERATIONS ─────────────────────────────────────────────────────
def match_building(conn, street: str, zip_code: str, borough: str = "") -> str | None:
    """Try to match a listing to an existing building by normalized address + zip."""
    if not street:
        return None

    normalized = normalize_address(street)
    cur = conn.cursor()

    if zip_code:
        cur.execute(
            "SELECT id FROM buildings WHERE zip_code = %s AND full_address ILIKE %s LIMIT 1",
            (zip_code, f"%{normalized}%")
        )
        row = cur.fetchone()
        if row:
            return row[0]

        # Try house number match
        parts = normalized.split()
        if len(parts) >= 2:
            cur.execute(
                "SELECT id FROM buildings WHERE zip_code = %s AND house_number = %s LIMIT 1",
                (zip_code, parts[0])
            )
            row = cur.fetchone()
            if row:
                return row[0]

    if borough:
        cur.execute(
            "SELECT id FROM buildings WHERE borough = %s AND full_address ILIKE %s LIMIT 1",
            (borough, f"%{normalized}%")
        )
        row = cur.fetchone()
        if row:
            return row[0]

    return None


def create_building(conn, street: str, borough: str, zip_code: str,
                    latitude: float = None, longitude: float = None) -> str | None:
    """Create a new building record. Returns building ID."""
    parts = street.upper().split(None, 1)
    house_number = parts[0] if parts else ""
    street_name = parts[1] if len(parts) > 1 else ""

    full_address = f"{street.upper()}, {borough}, NY"
    if zip_code:
        full_address += f", {zip_code}"

    slug = generate_slug(full_address)
    bid = cuid()
    now = datetime.now(timezone.utc)

    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO buildings (id, full_address, house_number, street_name, borough,
                                   city, state, zip_code, slug, latitude, longitude,
                                   overall_score, review_count, violation_count, complaint_count,
                                   litigation_count, dob_violation_count, crime_count,
                                   bedbug_report_count, eviction_count, permit_count,
                                   sidewalk_shed_count, lead_violation_count,
                                   created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET updated_at = EXCLUDED.updated_at
            RETURNING id
        """, (bid, full_address, house_number, street_name, borough,
              "New York", "NY", zip_code or None, slug, latitude, longitude,
              now, now))
        row = cur.fetchone()
        conn.commit()
        return row[0] if row else None
    except Exception as e:
        conn.rollback()
        print(f"    Building creation error: {e}")
        return None


def upsert_rents(conn, building_id: str, rent_by_beds: dict, source: str) -> int:
    """Upsert rent data for a building."""
    if not rent_by_beds:
        return 0

    now = datetime.now(timezone.utc)
    cur = conn.cursor()
    count = 0

    for beds, data in rent_by_beds.items():
        if beds < 0:
            continue
        min_r = data["min_rent"]
        max_r = data["max_rent"]
        median = (min_r + max_r) // 2
        rid = cuid()

        try:
            cur.execute("""
                INSERT INTO building_rents (id, building_id, source, bedrooms,
                    min_rent, max_rent, median_rent, listing_count,
                    scraped_at, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 1, %s, %s, %s)
                ON CONFLICT (building_id, source, bedrooms)
                DO UPDATE SET min_rent = EXCLUDED.min_rent,
                              max_rent = EXCLUDED.max_rent,
                              median_rent = EXCLUDED.median_rent,
                              listing_count = EXCLUDED.listing_count,
                              scraped_at = EXCLUDED.scraped_at,
                              updated_at = EXCLUDED.updated_at
            """, (rid, building_id, source, beds, min_r, max_r, median,
                  now, now, now))
            count += 1
        except Exception as e:
            conn.rollback()
            print(f"    Rent upsert error: {e}")

    conn.commit()
    return count


def upsert_amenities(conn, building_id: str, amenities: list[str], source: str) -> int:
    """Upsert amenity data for a building."""
    if not amenities:
        return 0

    now = datetime.now(timezone.utc)
    cur = conn.cursor()
    count = 0
    seen = set()

    for a in amenities:
        normalized = normalize_amenity(a)
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        aid = cuid()

        try:
            cur.execute("""
                INSERT INTO building_amenities (id, building_id, source, amenity, category,
                    scraped_at, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (building_id, source, amenity) DO NOTHING
            """, (aid, building_id, source, normalized, categorize_amenity(a),
                  now, now))
            count += 1
        except Exception as e:
            conn.rollback()
            print(f"    Amenity upsert error: {e}")

    conn.commit()
    return count


def upsert_listing(conn, building_id: str, listing: dict, source: str) -> bool:
    """Upsert full listing data into building_listings table."""
    now = datetime.now(timezone.utc)
    lid = cuid()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO building_listings (id, building_id, source,
                listing_name, listing_url, property_type,
                price_min, price_max, price_text,
                bed_min, bed_max, bath_min, bath_max,
                sqft_min, sqft_max, bed_text, bath_text, sqft_text,
                units_available, units_available_text, availability_status,
                management_company, verified, has_price_drops,
                listing_views, updated_at_source,
                floor_plans, bed_price_data, office_hours,
                scraped_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (building_id, source)
            DO UPDATE SET listing_name = EXCLUDED.listing_name,
                          listing_url = EXCLUDED.listing_url,
                          property_type = EXCLUDED.property_type,
                          price_min = EXCLUDED.price_min,
                          price_max = EXCLUDED.price_max,
                          price_text = EXCLUDED.price_text,
                          bed_min = EXCLUDED.bed_min,
                          bed_max = EXCLUDED.bed_max,
                          bath_min = EXCLUDED.bath_min,
                          bath_max = EXCLUDED.bath_max,
                          sqft_min = EXCLUDED.sqft_min,
                          sqft_max = EXCLUDED.sqft_max,
                          bed_text = EXCLUDED.bed_text,
                          bath_text = EXCLUDED.bath_text,
                          sqft_text = EXCLUDED.sqft_text,
                          units_available = EXCLUDED.units_available,
                          units_available_text = EXCLUDED.units_available_text,
                          availability_status = EXCLUDED.availability_status,
                          management_company = EXCLUDED.management_company,
                          verified = EXCLUDED.verified,
                          has_price_drops = EXCLUDED.has_price_drops,
                          listing_views = EXCLUDED.listing_views,
                          updated_at_source = EXCLUDED.updated_at_source,
                          floor_plans = EXCLUDED.floor_plans,
                          bed_price_data = EXCLUDED.bed_price_data,
                          office_hours = EXCLUDED.office_hours,
                          scraped_at = EXCLUDED.scraped_at
        """, (lid, building_id, source,
              listing.get("listing_name"),
              listing.get("listing_url"),
              listing.get("property_type"),
              listing.get("price_min"),
              listing.get("price_max"),
              listing.get("price_text"),
              listing.get("bed_min"),
              listing.get("bed_max"),
              listing.get("bath_min"),
              listing.get("bath_max"),
              listing.get("sqft_min"),
              listing.get("sqft_max"),
              listing.get("bed_text"),
              listing.get("bath_text"),
              listing.get("sqft_text"),
              listing.get("units_available", 0),
              listing.get("units_available_text"),
              listing.get("availability_status"),
              listing.get("management_company"),
              listing.get("verified", False),
              listing.get("has_price_drops", False),
              listing.get("listing_views"),
              listing.get("updated_at_source"),
              json.dumps(listing.get("floor_plans", [])),
              json.dumps(listing.get("bed_price_data", [])),
              json.dumps(listing.get("office_hours", [])),
              now, now))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"    Listing upsert error: {e}")
        return False
