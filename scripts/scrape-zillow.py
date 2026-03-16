#!/usr/bin/env python3
"""
Scrape rent data from zillow.com for NYC neighborhoods using Scrapling.

Uses StealthyFetcher with real_chrome=True to bypass anti-bot protection,
then extracts structured JSON from Next.js __NEXT_DATA__ payload.

Searches by NEIGHBORHOOD instead of borough to bypass Zillow's ~800 result
cap per search, yielding significantly more total coverage.

Usage:
    python3 scripts/scrape-zillow.py                              # all neighborhoods, 20 pages each
    python3 scripts/scrape-zillow.py --borough=Manhattan          # all Manhattan neighborhoods
    python3 scripts/scrape-zillow.py --neighborhood="upper-west-side" # single neighborhood
    python3 scripts/scrape-zillow.py --pages=10                   # fewer pages per neighborhood
    python3 scripts/scrape-zillow.py --dry-run                    # preview without DB writes
"""

import json
import re
import sys
import time
import argparse
from datetime import datetime

# Add scripts dir to path for db import
sys.path.insert(0, __import__("pathlib").Path(__file__).parent.__str__())
from db import (
    get_conn, match_building, create_building,
    upsert_rents, upsert_amenities, upsert_listing,
    normalize_address, detect_borough_from_city, detect_borough_from_zip,
    normalize_amenity, categorize_amenity, AMENITY_CATEGORIES,
)

from scrapling import StealthyFetcher

# ── CONSTANTS ────────────────────────────────────────────────────────────────
MAX_RETRIES = 3
RETRY_DELAY = 5
PAGE_DELAY = 4
LISTINGS_PER_PAGE = 41
SOURCE = "zillow"

# ── NEIGHBORHOOD URLs ────────────────────────────────────────────────────────
# Zillow URL slug -> (display name, borough)
# Searching by neighborhood bypasses the ~800 result cap per borough search.

NEIGHBORHOODS = {
    # ── Manhattan (40+ neighborhoods) ────────────────────────────────────
    "battery-park-city-new-york-ny": ("Battery Park City", "Manhattan"),
    "chelsea-new-york-ny": ("Chelsea", "Manhattan"),
    "chinatown-new-york-ny": ("Chinatown", "Manhattan"),
    "east-harlem-new-york-ny": ("East Harlem", "Manhattan"),
    "east-village-new-york-ny": ("East Village", "Manhattan"),
    "financial-district-new-york-ny": ("Financial District", "Manhattan"),
    "flatiron-new-york-ny": ("Flatiron", "Manhattan"),
    "gramercy-park-new-york-ny": ("Gramercy Park", "Manhattan"),
    "greenwich-village-new-york-ny": ("Greenwich Village", "Manhattan"),
    "hamilton-heights-new-york-ny": ("Hamilton Heights", "Manhattan"),
    "harlem-new-york-ny": ("Harlem", "Manhattan"),
    "hells-kitchen-new-york-ny": ("Hell's Kitchen", "Manhattan"),
    "inwood-new-york-ny": ("Inwood", "Manhattan"),
    "kips-bay-new-york-ny": ("Kips Bay", "Manhattan"),
    "lenox-hill-new-york-ny": ("Lenox Hill", "Manhattan"),
    "little-italy-new-york-ny": ("Little Italy", "Manhattan"),
    "lower-east-side-new-york-ny": ("Lower East Side", "Manhattan"),
    "marble-hill-new-york-ny": ("Marble Hill", "Manhattan"),
    "midtown-new-york-ny": ("Midtown", "Manhattan"),
    "midtown-east-new-york-ny": ("Midtown East", "Manhattan"),
    "midtown-west-new-york-ny": ("Midtown West", "Manhattan"),
    "morningside-heights-new-york-ny": ("Morningside Heights", "Manhattan"),
    "murray-hill-new-york-ny": ("Murray Hill", "Manhattan"),
    "noho-new-york-ny": ("NoHo", "Manhattan"),
    "nolita-new-york-ny": ("Nolita", "Manhattan"),
    "roosevelt-island-new-york-ny": ("Roosevelt Island", "Manhattan"),
    "soho-new-york-ny": ("SoHo", "Manhattan"),
    "stuyvesant-town-new-york-ny": ("Stuyvesant Town", "Manhattan"),
    "tribeca-new-york-ny": ("Tribeca", "Manhattan"),
    "two-bridges-new-york-ny": ("Two Bridges", "Manhattan"),
    "upper-east-side-new-york-ny": ("Upper East Side", "Manhattan"),
    "upper-west-side-new-york-ny": ("Upper West Side", "Manhattan"),
    "washington-heights-new-york-ny": ("Washington Heights", "Manhattan"),
    "west-village-new-york-ny": ("West Village", "Manhattan"),
    "yorkville-new-york-ny": ("Yorkville", "Manhattan"),

    # ── Brooklyn (30+ neighborhoods) ─────────────────────────────────────
    "bay-ridge-new-york-ny": ("Bay Ridge", "Brooklyn"),
    "bed-stuy-new-york-ny": ("Bed-Stuy", "Brooklyn"),
    "bensonhurst-new-york-ny": ("Bensonhurst", "Brooklyn"),
    "boerum-hill-new-york-ny": ("Boerum Hill", "Brooklyn"),
    "borough-park-new-york-ny": ("Borough Park", "Brooklyn"),
    "brighton-beach-new-york-ny": ("Brighton Beach", "Brooklyn"),
    "brooklyn-heights-new-york-ny": ("Brooklyn Heights", "Brooklyn"),
    "brownsville-new-york-ny": ("Brownsville", "Brooklyn"),
    "bushwick-new-york-ny": ("Bushwick", "Brooklyn"),
    "canarsie-new-york-ny": ("Canarsie", "Brooklyn"),
    "carroll-gardens-new-york-ny": ("Carroll Gardens", "Brooklyn"),
    "clinton-hill-new-york-ny": ("Clinton Hill", "Brooklyn"),
    "cobble-hill-new-york-ny": ("Cobble Hill", "Brooklyn"),
    "coney-island-new-york-ny": ("Coney Island", "Brooklyn"),
    "crown-heights-new-york-ny": ("Crown Heights", "Brooklyn"),
    "ditmas-park-new-york-ny": ("Ditmas Park", "Brooklyn"),
    "downtown-brooklyn-new-york-ny": ("Downtown Brooklyn", "Brooklyn"),
    "dumbo-new-york-ny": ("DUMBO", "Brooklyn"),
    "dyker-heights-new-york-ny": ("Dyker Heights", "Brooklyn"),
    "east-flatbush-new-york-ny": ("East Flatbush", "Brooklyn"),
    "east-new-york-new-york-ny": ("East New York", "Brooklyn"),
    "flatbush-new-york-ny": ("Flatbush", "Brooklyn"),
    "flatlands-new-york-ny": ("Flatlands", "Brooklyn"),
    "fort-greene-new-york-ny": ("Fort Greene", "Brooklyn"),
    "gowanus-new-york-ny": ("Gowanus", "Brooklyn"),
    "gravesend-new-york-ny": ("Gravesend", "Brooklyn"),
    "greenpoint-new-york-ny": ("Greenpoint", "Brooklyn"),
    "kensington-brooklyn-new-york-ny": ("Kensington", "Brooklyn"),
    "midwood-new-york-ny": ("Midwood", "Brooklyn"),
    "park-slope-new-york-ny": ("Park Slope", "Brooklyn"),
    "prospect-heights-new-york-ny": ("Prospect Heights", "Brooklyn"),
    "prospect-lefferts-gardens-new-york-ny": ("Prospect Lefferts Gardens", "Brooklyn"),
    "red-hook-new-york-ny": ("Red Hook", "Brooklyn"),
    "sheepshead-bay-new-york-ny": ("Sheepshead Bay", "Brooklyn"),
    "south-slope-new-york-ny": ("South Slope", "Brooklyn"),
    "sunset-park-new-york-ny": ("Sunset Park", "Brooklyn"),
    "williamsburg-new-york-ny": ("Williamsburg", "Brooklyn"),
    "windsor-terrace-new-york-ny": ("Windsor Terrace", "Brooklyn"),

    # ── Queens (25+ neighborhoods) ───────────────────────────────────────
    "astoria-new-york-ny": ("Astoria", "Queens"),
    "bayside-new-york-ny": ("Bayside", "Queens"),
    "briarwood-new-york-ny": ("Briarwood", "Queens"),
    "college-point-new-york-ny": ("College Point", "Queens"),
    "corona-new-york-ny": ("Corona", "Queens"),
    "east-elmhurst-new-york-ny": ("East Elmhurst", "Queens"),
    "elmhurst-new-york-ny": ("Elmhurst", "Queens"),
    "far-rockaway-new-york-ny": ("Far Rockaway", "Queens"),
    "flushing-new-york-ny": ("Flushing", "Queens"),
    "forest-hills-new-york-ny": ("Forest Hills", "Queens"),
    "fresh-meadows-new-york-ny": ("Fresh Meadows", "Queens"),
    "howard-beach-new-york-ny": ("Howard Beach", "Queens"),
    "jackson-heights-new-york-ny": ("Jackson Heights", "Queens"),
    "jamaica-new-york-ny": ("Jamaica", "Queens"),
    "kew-gardens-new-york-ny": ("Kew Gardens", "Queens"),
    "long-island-city-new-york-ny": ("Long Island City", "Queens"),
    "maspeth-new-york-ny": ("Maspeth", "Queens"),
    "middle-village-new-york-ny": ("Middle Village", "Queens"),
    "ozone-park-new-york-ny": ("Ozone Park", "Queens"),
    "rego-park-new-york-ny": ("Rego Park", "Queens"),
    "richmond-hill-new-york-ny": ("Richmond Hill", "Queens"),
    "ridgewood-new-york-ny": ("Ridgewood", "Queens"),
    "south-ozone-park-new-york-ny": ("South Ozone Park", "Queens"),
    "sunnyside-new-york-ny": ("Sunnyside", "Queens"),
    "whitestone-new-york-ny": ("Whitestone", "Queens"),
    "woodhaven-new-york-ny": ("Woodhaven", "Queens"),
    "woodside-new-york-ny": ("Woodside", "Queens"),

    # ── Bronx (20+ neighborhoods) ────────────────────────────────────────
    "baychester-new-york-ny": ("Baychester", "Bronx"),
    "belmont-new-york-ny": ("Belmont", "Bronx"),
    "castle-hill-new-york-ny": ("Castle Hill", "Bronx"),
    "city-island-new-york-ny": ("City Island", "Bronx"),
    "co-op-city-new-york-ny": ("Co-op City", "Bronx"),
    "concourse-new-york-ny": ("Concourse", "Bronx"),
    "country-club-new-york-ny": ("Country Club", "Bronx"),
    "fordham-new-york-ny": ("Fordham", "Bronx"),
    "highbridge-new-york-ny": ("Highbridge", "Bronx"),
    "hunts-point-new-york-ny": ("Hunts Point", "Bronx"),
    "kingsbridge-new-york-ny": ("Kingsbridge", "Bronx"),
    "melrose-new-york-ny": ("Melrose", "Bronx"),
    "morris-heights-new-york-ny": ("Morris Heights", "Bronx"),
    "morris-park-new-york-ny": ("Morris Park", "Bronx"),
    "morrisania-new-york-ny": ("Morrisania", "Bronx"),
    "mott-haven-new-york-ny": ("Mott Haven", "Bronx"),
    "norwood-new-york-ny": ("Norwood", "Bronx"),
    "parkchester-new-york-ny": ("Parkchester", "Bronx"),
    "pelham-bay-new-york-ny": ("Pelham Bay", "Bronx"),
    "pelham-gardens-new-york-ny": ("Pelham Gardens", "Bronx"),
    "riverdale-new-york-ny": ("Riverdale", "Bronx"),
    "soundview-new-york-ny": ("Soundview", "Bronx"),
    "throgs-neck-new-york-ny": ("Throgs Neck", "Bronx"),
    "tremont-new-york-ny": ("Tremont", "Bronx"),
    "university-heights-new-york-ny": ("University Heights", "Bronx"),
    "wakefield-new-york-ny": ("Wakefield", "Bronx"),
    "westchester-square-new-york-ny": ("Westchester Square", "Bronx"),
    "williamsbridge-new-york-ny": ("Williamsbridge", "Bronx"),
    "woodlawn-new-york-ny": ("Woodlawn", "Bronx"),

    # ── Staten Island (10+ neighborhoods) ────────────────────────────────
    "annadale-new-york-ny": ("Annadale", "Staten Island"),
    "arden-heights-new-york-ny": ("Arden Heights", "Staten Island"),
    "bulls-head-new-york-ny": ("Bulls Head", "Staten Island"),
    "dongan-hills-new-york-ny": ("Dongan Hills", "Staten Island"),
    "eltingville-new-york-ny": ("Eltingville", "Staten Island"),
    "great-kills-new-york-ny": ("Great Kills", "Staten Island"),
    "grymes-hill-new-york-ny": ("Grymes Hill", "Staten Island"),
    "huguenot-new-york-ny": ("Huguenot", "Staten Island"),
    "mariners-harbor-new-york-ny": ("Mariners Harbor", "Staten Island"),
    "new-brighton-new-york-ny": ("New Brighton", "Staten Island"),
    "new-dorp-new-york-ny": ("New Dorp", "Staten Island"),
    "port-richmond-new-york-ny": ("Port Richmond", "Staten Island"),
    "prince-s-bay-new-york-ny": ("Prince's Bay", "Staten Island"),
    "rosebank-new-york-ny": ("Rosebank", "Staten Island"),
    "st-george-new-york-ny": ("St. George", "Staten Island"),
    "stapleton-new-york-ny": ("Stapleton", "Staten Island"),
    "todt-hill-new-york-ny": ("Todt Hill", "Staten Island"),
    "tottenville-new-york-ny": ("Tottenville", "Staten Island"),
    "west-brighton-new-york-ny": ("West Brighton", "Staten Island"),
    "westerleigh-new-york-ny": ("Westerleigh", "Staten Island"),
}


def get_zillow_url(slug: str) -> str:
    """Build Zillow rental search URL from a neighborhood slug."""
    return f"https://www.zillow.com/{slug}/rentals/"


# ── HELPERS ──────────────────────────────────────────────────────────────────
def parse_price(price_str: str) -> int | None:
    if not price_str:
        return None
    cleaned = re.sub(r'[^\d]', '', price_str)
    if not cleaned:
        return None
    val = int(cleaned)
    if 500 <= val <= 50000:
        return val
    return None


def detect_borough(listing: dict) -> str:
    city = listing.get("address_city", "").strip().lower()
    boro = detect_borough_from_city(city) if city else None
    if boro:
        return boro

    addr = listing.get("address", "")
    parts = addr.split(",")
    if len(parts) >= 2:
        boro = detect_borough_from_city(parts[1].strip())
        if boro:
            return boro

    zc = listing.get("zip_code", "")
    if zc:
        return detect_borough_from_zip(zc)
    return "Manhattan"


# ── FETCHING ─────────────────────────────────────────────────────────────────
def fetch_page(url: str) -> dict | None:
    for attempt in range(MAX_RETRIES):
        try:
            page = StealthyFetcher.fetch(
                url,
                headless=True,
                real_chrome=True,
                network_idle=True,
                timeout=30000,
                wait=5000,
            )

            if page.status != 200:
                print(f"    Attempt {attempt + 1}: HTTP {page.status}")
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue

            next_data = page.css("script#__NEXT_DATA__")
            if not next_data or len(next_data) == 0:
                print(f"    Attempt {attempt + 1}: No __NEXT_DATA__ found")
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue

            data = json.loads(next_data[0].text)
            return data

        except Exception as e:
            print(f"    Attempt {attempt + 1}: Error - {e}")
            time.sleep(RETRY_DELAY * (attempt + 1))

    return None


def extract_listings(data: dict) -> tuple[list[dict], int]:
    try:
        search_results = data["props"]["pageProps"]["searchPageState"]["cat1"]["searchResults"]
        list_results = search_results.get("listResults", [])
        total = search_results.get("totalResultCount", 0)

        listings = []
        for item in list_results:
            if item.get("statusType") != "FOR_RENT":
                continue

            address = item.get("address", "")
            address_street = item.get("addressStreet", "")
            address_city = item.get("addressCity", "")
            address_zipcode = item.get("addressZipcode", "")
            lat_long = item.get("latLong", {}) or {}
            latitude = lat_long.get("latitude")
            longitude = lat_long.get("longitude")
            building_name = item.get("buildingName", "")
            detail_url = item.get("detailUrl", "")
            units = item.get("units", []) or []
            availability_count = item.get("availabilityCount", 0)

            address_full = address
            if address_zipcode and address_zipcode not in address:
                address_full = f"{address} {address_zipcode}"

            street = address_street.split("#")[0].strip() if address_street else ""
            if not street:
                street = address.split(",")[0].strip() if "," in address else address

            rent_by_beds = {}
            for unit in units:
                if unit.get("roomForRent"):
                    continue
                price = parse_price(unit.get("price", ""))
                if price is None:
                    continue
                beds_str = unit.get("beds", "")
                try:
                    beds = int(beds_str)
                except (ValueError, TypeError):
                    continue
                if beds in rent_by_beds:
                    entry = rent_by_beds[beds]
                    if price < entry["min_rent"]:
                        entry["min_rent"] = price
                    if price > entry["max_rent"]:
                        entry["max_rent"] = price
                else:
                    rent_by_beds[beds] = {
                        "min_rent": price,
                        "max_rent": price,
                        "sqft_min": None,
                        "sqft_max": None,
                    }

            all_prices = [parse_price(u.get("price", "")) for u in units if not u.get("roomForRent")]
            all_prices = [p for p in all_prices if p is not None]
            price_min = min(all_prices) if all_prices else None
            price_max = max(all_prices) if all_prices else None

            all_beds = []
            for u in units:
                if u.get("roomForRent"):
                    continue
                try:
                    all_beds.append(int(u.get("beds", "")))
                except (ValueError, TypeError):
                    pass
            bed_min = min(all_beds) if all_beds else None
            bed_max = max(all_beds) if all_beds else None

            if price_min and price_max and price_min != price_max:
                price_text = f"${price_min:,} - ${price_max:,}"
            elif price_min:
                price_text = f"${price_min:,}+"
            else:
                price_text = ""

            if bed_min is not None and bed_max is not None and bed_min != bed_max:
                bed_text = f"{bed_min}-{bed_max} beds"
            elif bed_min is not None:
                bed_text = f"{'Studio' if bed_min == 0 else f'{bed_min} bed'}"
            else:
                bed_text = ""

            amenities = []
            rec = item.get("listCardRecommendation", {}) or {}
            flex_recs = rec.get("flexFieldRecommendations", []) or []
            for fr in flex_recs:
                content_type = fr.get("contentType", "")
                display_str = fr.get("displayString", "")
                if content_type == "homeInsight" and display_str:
                    amenities.append(display_str)
            zov = rec.get("zovInsight", {}) or {}
            if zov.get("displayString"):
                amenities.append(zov["displayString"])

            if detail_url and not detail_url.startswith("http"):
                detail_url = f"https://www.zillow.com{detail_url}"

            listings.append({
                "name": building_name or street,
                "address": address,
                "address_street": street,
                "address_city": address_city,
                "address_full": address_full,
                "zip_code": address_zipcode,
                "latitude": latitude,
                "longitude": longitude,
                "property_type": "MULTI_FAMILY" if item.get("isBuilding") else "APARTMENT",
                "listing_url": detail_url,
                "amenities": amenities,
                "rent_by_beds": rent_by_beds,
                "listing_name": building_name or street,
                "price_min": price_min,
                "price_max": price_max,
                "price_text": price_text,
                "bed_min": bed_min,
                "bed_max": bed_max,
                "bath_min": None,
                "bath_max": None,
                "sqft_min": None,
                "sqft_max": None,
                "bed_text": bed_text,
                "bath_text": "",
                "sqft_text": "",
                "units_available": availability_count or len(units),
                "units_available_text": f"{availability_count} available" if availability_count else "",
                "availability_status": item.get("statusText", ""),
                "management_company": None,
                "verified": False,
                "has_price_drops": False,
                "listing_views": None,
                "updated_at_source": None,
                "floor_plans": [],
                "bed_price_data": [],
                "office_hours": [],
            })

        return listings, total

    except (KeyError, TypeError) as e:
        print(f"    Error extracting listings: {e}")
        return [], 0


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Scrape zillow.com for NYC rent data by neighborhood")
    parser.add_argument("--borough", type=str, default="",
                        help="Filter to neighborhoods in this borough (Manhattan, Brooklyn, Queens, Bronx, Staten Island)")
    parser.add_argument("--neighborhood", type=str, default="",
                        help="Single neighborhood slug to scrape (e.g. 'upper-west-side-new-york-ny')")
    parser.add_argument("--pages", type=int, default=20,
                        help="Max pages per neighborhood (41 listings/page)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without writing to DB")
    parser.add_argument("--start-page", type=int, default=1,
                        help="Starting page number")
    parser.add_argument("--list-neighborhoods", action="store_true",
                        help="Print all neighborhood slugs and exit")
    args = parser.parse_args()

    if args.list_neighborhoods:
        for slug, (name, boro) in sorted(NEIGHBORHOODS.items(), key=lambda x: (x[1][1], x[1][0])):
            print(f"  {boro:15s} | {name:30s} | --neighborhood={slug}")
        print(f"\nTotal: {len(NEIGHBORHOODS)} neighborhoods")
        return

    # Determine which neighborhoods to scrape
    if args.neighborhood:
        slug = args.neighborhood
        if slug not in NEIGHBORHOODS:
            # Try partial match
            matches = [s for s in NEIGHBORHOODS if slug in s]
            if len(matches) == 1:
                slug = matches[0]
            elif len(matches) > 1:
                print(f"Ambiguous neighborhood '{slug}'. Matches:")
                for m in matches:
                    print(f"  {m} ({NEIGHBORHOODS[m][0]}, {NEIGHBORHOODS[m][1]})")
                return
            else:
                print(f"Unknown neighborhood slug: {slug}")
                print("Use --list-neighborhoods to see all available slugs")
                return
        targets = {slug: NEIGHBORHOODS[slug]}
    elif args.borough:
        targets = {s: info for s, info in NEIGHBORHOODS.items() if info[1] == args.borough}
        if not targets:
            print(f"No neighborhoods found for borough: {args.borough}")
            print("Valid boroughs: Manhattan, Brooklyn, Queens, Bronx, Staten Island")
            return
    else:
        targets = NEIGHBORHOODS

    max_pages = args.pages
    dry_run = args.dry_run

    conn = None if dry_run else get_conn()

    total_matched = 0
    total_created = 0
    total_failed = 0
    total_rents = 0
    total_amenities = 0
    total_listings_saved = 0
    total_listings = 0
    neighborhoods_scraped = 0

    boroughs_in_scope = sorted(set(info[1] for info in targets.values()))
    print(f"Scraping zillow.com by neighborhood")
    print(f"  Boroughs: {boroughs_in_scope}")
    print(f"  Neighborhoods: {len(targets)}")
    print(f"  Max pages per neighborhood: {max_pages}")
    print(f"  Estimated max listings: ~{len(targets) * max_pages * LISTINGS_PER_PAGE:,}")
    print(f"  Dry run: {dry_run}")
    print(f"  Start time: {datetime.now()}\n")

    for slug, (hood_name, borough) in targets.items():
        neighborhoods_scraped += 1
        base_url = get_zillow_url(slug)

        print(f"\n{'='*60}")
        print(f"[{neighborhoods_scraped}/{len(targets)}] {hood_name} ({borough})")
        print(f"{'='*60}")

        for page_num in range(args.start_page, args.start_page + max_pages):
            url = base_url if page_num == 1 else f"{base_url}{page_num}_p/"
            print(f"\n  Page {page_num}: {url}")

            data = fetch_page(url)
            if data is None:
                print(f"    FAILED to fetch page {page_num} after {MAX_RETRIES} retries. Skipping.")
                continue

            listings, total_results = extract_listings(data)
            print(f"    Got {len(listings)} listings (total available: {total_results})")

            if len(listings) == 0:
                print(f"    No more listings. Moving to next neighborhood.")
                break

            total_listings += len(listings)

            for listing in listings:
                addr = listing["address_full"] or listing["address"]
                beds_available = list(listing["rent_by_beds"].keys())
                amenity_count = len(listing["amenities"])

                if dry_run:
                    print(f"    [DRY RUN] {addr} | beds={beds_available} | amenities={amenity_count}")
                    continue

                street = listing["address_street"]
                zip_code = listing["zip_code"]
                boro = detect_borough(listing)

                building_id = match_building(conn, street, zip_code, boro)

                if building_id:
                    total_matched += 1
                    label = "MATCHED"
                else:
                    building_id = create_building(conn, street, boro, zip_code,
                                                  listing.get("latitude"),
                                                  listing.get("longitude"))
                    if building_id:
                        total_created += 1
                        label = "CREATED"
                    else:
                        total_failed += 1
                        print(f"    SKIP {addr} (could not match or create)")
                        continue

                rents_added = upsert_rents(conn, building_id, listing["rent_by_beds"], SOURCE)
                amenities_added = upsert_amenities(conn, building_id, listing["amenities"], SOURCE)
                listing_saved = upsert_listing(conn, building_id, listing, SOURCE)

                total_rents += rents_added
                total_amenities += amenities_added
                if listing_saved:
                    total_listings_saved += 1

                print(f"    {label} {addr} -> {rents_added} rents, {amenities_added} amenities, listing={'OK' if listing_saved else 'FAIL'}")

            if page_num * LISTINGS_PER_PAGE >= total_results:
                print(f"    Reached end of results ({total_results} total). Moving to next neighborhood.")
                break

            print(f"    Waiting {PAGE_DELAY}s...")
            time.sleep(PAGE_DELAY)

    if conn:
        conn.close()

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Neighborhoods scraped:   {neighborhoods_scraped}")
    print(f"Total listings scraped:  {total_listings}")
    print(f"Matched to buildings:    {total_matched}")
    print(f"New buildings created:   {total_created}")
    print(f"Failed (no match/create):{total_failed}")
    print(f"Rent records upserted:   {total_rents}")
    print(f"Amenity records upserted:{total_amenities}")
    print(f"Full listings saved:     {total_listings_saved}")
    print(f"End time: {datetime.now()}")


if __name__ == "__main__":
    main()
