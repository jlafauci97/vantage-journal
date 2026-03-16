#!/usr/bin/env python3
"""
Scrape rent data from zillow.com for NYC's five boroughs using Scrapling.

Uses StealthyFetcher with real_chrome=True to bypass anti-bot protection,
then extracts structured JSON from Next.js __NEXT_DATA__ payload.

Usage:
    python3 scripts/scrape-zillow.py                        # all boroughs, 5 pages each
    python3 scripts/scrape-zillow.py --borough=Manhattan    # single borough
    python3 scripts/scrape-zillow.py --pages=20             # more pages per borough
    python3 scripts/scrape-zillow.py --start-page=3         # start from page 3
    python3 scripts/scrape-zillow.py --dry-run              # preview without DB writes
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
BOROUGH_URLS = {
    "Manhattan": "https://www.zillow.com/manhattan-new-york-ny/rentals/",
    "Brooklyn": "https://www.zillow.com/brooklyn-new-york-ny/rentals/",
    "Queens": "https://www.zillow.com/queens-new-york-ny/rentals/",
    "Bronx": "https://www.zillow.com/bronx-new-york-ny/rentals/",
    "Staten Island": "https://www.zillow.com/staten-island-new-york-ny/rentals/",
}

MAX_RETRIES = 3
RETRY_DELAY = 5
PAGE_DELAY = 4
LISTINGS_PER_PAGE = 41
SOURCE = "zillow"


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
    parser = argparse.ArgumentParser(description="Scrape zillow.com for NYC rent data")
    parser.add_argument("--borough", type=str, default="", help="Single borough to scrape")
    parser.add_argument("--pages", type=int, default=5, help="Pages per borough (41 listings/page)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")
    parser.add_argument("--start-page", type=int, default=1, help="Starting page number")
    args = parser.parse_args()

    boroughs = {args.borough: BOROUGH_URLS[args.borough]} if args.borough else BOROUGH_URLS
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

    print(f"Scraping zillow.com — boroughs={list(boroughs.keys())}, pages={max_pages}, dry_run={dry_run}")
    print(f"Start time: {datetime.now()}\n")

    for borough, base_url in boroughs.items():
        print(f"\n{'='*60}")
        print(f"BOROUGH: {borough}")
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
                print(f"    No more listings. Moving to next borough.")
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
                print(f"    Reached end of results ({total_results} total). Moving to next borough.")
                break

            print(f"    Waiting {PAGE_DELAY}s...")
            time.sleep(PAGE_DELAY)

    if conn:
        conn.close()

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
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
