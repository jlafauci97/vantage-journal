#!/usr/bin/env python3
"""
Scrape rent and amenity data from apartments.com for NYC's five boroughs using Scrapling.

Uses StealthyFetcher with real_chrome=True to bypass anti-bot protection,
then extracts structured data from HTML article elements.

Usage:
    python3 scripts/scrape-apartments-com.py                        # all boroughs, 5 pages each
    python3 scripts/scrape-apartments-com.py --borough=Manhattan    # single borough
    python3 scripts/scrape-apartments-com.py --pages=18             # more pages per borough
    python3 scripts/scrape-apartments-com.py --dry-run              # preview without DB writes
"""

import json
import re
import sys
import time
import argparse
from datetime import datetime

sys.path.insert(0, __import__("pathlib").Path(__file__).parent.__str__())
from db import (
    match_building, create_building,
    upsert_rents, upsert_amenities, upsert_listing,
    normalize_address, detect_borough_from_city, detect_borough_from_zip,
)

from scrapling import StealthyFetcher

# ── CONSTANTS ────────────────────────────────────────────────────────────────
BOROUGH_URLS = {
    "Manhattan": "https://www.apartments.com/manhattan-ny/",
    "Brooklyn": "https://www.apartments.com/brooklyn-ny/",
    "Queens": "https://www.apartments.com/queens-ny/",
    "Bronx": "https://www.apartments.com/bronx-ny/",
    "Staten Island": "https://www.apartments.com/staten-island-ny/",
}

MAX_RETRIES = 3
RETRY_DELAY = 5
PAGE_DELAY = 4
LISTINGS_PER_PAGE = 40
MAX_RESULTS = 700
SOURCE = "apartments_com"


# ── PRICE / BED PARSING ─────────────────────────────────────────────────────
def parse_price_text(text: str) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    amounts = re.findall(r'\$[\d,]+', text)
    if not amounts:
        return None, None
    prices = []
    for amt in amounts:
        try:
            price = int(amt.replace("$", "").replace(",", ""))
            if 500 <= price <= 50000:
                prices.append(price)
        except ValueError:
            continue
    if not prices:
        return None, None
    return min(prices), max(prices)


def parse_bed_text(text: str) -> list[int]:
    if not text:
        return []
    beds = []
    text_lower = text.lower()
    if "studio" in text_lower:
        beds.append(0)
    bed_matches = re.findall(r'(\d+)\s*(?:bed|bd)', text_lower)
    for m in bed_matches:
        try:
            count = int(m)
            if 0 <= count <= 10 and count not in beds:
                beds.append(count)
        except ValueError:
            continue
    return sorted(beds)


# ── FETCHING ─────────────────────────────────────────────────────────────────
def fetch_page(url: str):
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
            return page
        except Exception as e:
            print(f"    Attempt {attempt + 1}: Error - {e}")
            time.sleep(RETRY_DELAY * (attempt + 1))
    return None


def extract_listings_from_html(page) -> list[dict]:
    listings = []
    articles = page.css("article[data-listingid]")
    if not articles:
        return []

    for article in articles:
        try:
            listing_id = article.attrib.get("data-listingid", "")
            detail_url = article.attrib.get("data-url", "")
            street_address = article.attrib.get("data-streetaddress", "")

            name_els = article.css(".js-placardTitle.title")
            name = name_els[0].text.strip() if name_els else ""

            addr_els = article.css(".property-address.js-url")
            if not addr_els:
                addr_els = article.css(".property-address")
            address_text = addr_els[0].text.strip() if addr_els else street_address

            rent_by_beds = {}
            all_price_min = None
            all_price_max = None
            all_children = article.css("*")
            bed_counts = []

            for i, child in enumerate(all_children):
                cls = child.attrib.get("class", "")
                text = (child.text or "").strip()
                if "bedTextBox" in cls and text:
                    beds_parsed = parse_bed_text(text)
                    for j in range(i + 1, min(i + 4, len(all_children))):
                        sib_text = (all_children[j].text or "").strip()
                        sib_cls = all_children[j].attrib.get("class", "")
                        if sib_text and "$" in sib_text:
                            p_min, p_max = parse_price_text(sib_text)
                            if p_min is not None:
                                for b in beds_parsed:
                                    bed_counts.append(b)
                                    rent_by_beds[b] = {
                                        "min_rent": p_min,
                                        "max_rent": p_max if p_max else p_min,
                                        "sqft_min": None,
                                        "sqft_max": None,
                                    }
                                    if all_price_min is None or p_min < all_price_min:
                                        all_price_min = p_min
                                    if all_price_max is None or (p_max or p_min) > all_price_max:
                                        all_price_max = p_max or p_min
                            break
                        if "bedTextBox" in sib_cls:
                            break

            amenities = []
            known_non_amenities = {"email", "call", "tours", "videos", "virtual tours",
                                   "3d tours", "specials", "new", "verified"}
            for child in all_children:
                cls = child.attrib.get("class", "")
                text = (child.text or "").strip()
                if not cls and text and len(text) > 2 and len(text) < 50 and "$" not in text:
                    if text.lower() not in known_non_amenities and not text[0].isdigit():
                        if any(kw in text.lower() for kw in [
                            "pet", "fitness", "pool", "parking", "laundry", "gym",
                            "doorman", "elevator", "roof", "balcon", "storage",
                            "concierge", "club", "lounge", "internet", "bath",
                            "bedroom", "dishwasher", "air", "a/c",
                        ]):
                            amenities.append(text)

            if all_price_min is None:
                continue

            addr_parts = address_text.split(",")
            street = addr_parts[0].strip() if addr_parts else address_text
            city = addr_parts[1].strip() if len(addr_parts) >= 2 else ""
            state_zip = addr_parts[2].strip() if len(addr_parts) >= 3 else ""
            zip_match = re.search(r'(\d{5})', state_zip)
            zip_code = zip_match.group(1) if zip_match else ""

            valid_beds = [b for b in bed_counts if b >= 0]
            bed_min = min(valid_beds) if valid_beds else None
            bed_max = max(valid_beds) if valid_beds else None

            listings.append({
                "listing_id": listing_id,
                "name": name,
                "address": street,
                "address_full": address_text,
                "zip_code": zip_code,
                "city": city,
                "latitude": None,
                "longitude": None,
                "property_type": "",
                "listing_url": detail_url,
                "amenities": amenities,
                "rent_by_beds": rent_by_beds,
                "listing_name": name,
                "price_min": all_price_min,
                "price_max": all_price_max,
                "price_text": f"${all_price_min:,}" + (f" - ${all_price_max:,}" if all_price_max and all_price_max != all_price_min else "") if all_price_min else "",
                "bed_min": bed_min,
                "bed_max": bed_max,
                "bath_min": None,
                "bath_max": None,
                "sqft_min": None,
                "sqft_max": None,
                "bed_text": ", ".join(f"{b} Bed" if b > 0 else "Studio" for b in bed_counts) if bed_counts else "",
                "bath_text": "",
                "sqft_text": "",
                "units_available": 0,
                "units_available_text": "",
                "availability_status": "",
                "management_company": None,
                "verified": False,
                "has_price_drops": False,
                "listing_views": None,
                "updated_at_source": None,
                "floor_plans": [],
                "bed_price_data": [],
                "office_hours": [],
            })

        except Exception as e:
            print(f"    Error parsing article: {e}")
            continue

    return listings


def detect_borough(listing: dict) -> str:
    city = listing.get("city", "").strip().lower()
    boro = detect_borough_from_city(city) if city else None
    if boro:
        return boro

    addr_parts = listing.get("address_full", "").split(",")
    if len(addr_parts) >= 2:
        boro = detect_borough_from_city(addr_parts[1].strip())
        if boro:
            return boro

    zc = listing.get("zip_code", "")
    if zc:
        return detect_borough_from_zip(zc)
    return "Manhattan"


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Scrape apartments.com for NYC rent data")
    parser.add_argument("--borough", type=str, default="", help="Single borough to scrape")
    parser.add_argument("--pages", type=int, default=5, help="Pages per borough (40 listings/page)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")
    parser.add_argument("--start-page", type=int, default=1, help="Starting page number")
    args = parser.parse_args()

    boroughs = {args.borough: BOROUGH_URLS[args.borough]} if args.borough else BOROUGH_URLS
    max_pages = min(args.pages, 18)
    dry_run = args.dry_run

    # DB connection is managed by db.py module (Supabase client)

    total_matched = 0
    total_created = 0
    total_failed = 0
    total_rents = 0
    total_amenities = 0
    total_listings_saved = 0
    total_listings = 0

    print(f"Scraping apartments.com — boroughs={list(boroughs.keys())}, pages={max_pages}, dry_run={dry_run}")
    print(f"Start time: {datetime.now()}\n")

    for borough, base_url in boroughs.items():
        print(f"\n{'='*60}")
        print(f"BOROUGH: {borough}")
        print(f"{'='*60}")

        for page_num in range(args.start_page, args.start_page + max_pages):
            url = base_url if page_num == 1 else f"{base_url}{page_num}/"
            print(f"\n  Page {page_num}: {url}")

            page = fetch_page(url)
            if page is None:
                print(f"    FAILED to fetch page {page_num} after {MAX_RETRIES} retries. Skipping.")
                continue

            listings = extract_listings_from_html(page)
            print(f"    Got {len(listings)} listings")

            if len(listings) == 0:
                print(f"    No more listings. Moving to next borough.")
                break

            total_listings += len(listings)

            for listing in listings:
                addr = listing["address_full"] or listing["address"]
                beds_available = list(listing["rent_by_beds"].keys())
                amenity_count = len(listing["amenities"])

                if dry_run:
                    price_str = listing.get("price_text", "")
                    print(f"    [DRY RUN] {addr} | {price_str} | beds={beds_available} | amenities={amenity_count}")
                    continue

                street = listing["address"]
                zip_code = listing["zip_code"]
                boro = detect_borough(listing)

                building_id = match_building(street, zip_code, boro)

                if building_id:
                    total_matched += 1
                    label = "MATCHED"
                else:
                    building_id = create_building(street, boro, zip_code,
                                                  listing.get("latitude"),
                                                  listing.get("longitude"))
                    if building_id:
                        total_created += 1
                        label = "CREATED"
                    else:
                        total_failed += 1
                        print(f"    SKIP {addr} (could not match or create)")
                        continue

                rents_added = upsert_rents(building_id, listing["rent_by_beds"], SOURCE)
                amenities_added = upsert_amenities(building_id, listing["amenities"], SOURCE)
                listing_saved = upsert_listing(building_id, listing, SOURCE)

                total_rents += rents_added
                total_amenities += amenities_added
                if listing_saved:
                    total_listings_saved += 1

                print(f"    {label} {addr} -> {rents_added} rents, {amenities_added} amenities, listing={'OK' if listing_saved else 'FAIL'}")

            if page_num * LISTINGS_PER_PAGE >= MAX_RESULTS:
                print(f"    Reached apartments.com result cap (~{MAX_RESULTS}). Moving to next borough.")
                break

            print(f"    Waiting {PAGE_DELAY}s...")
            time.sleep(PAGE_DELAY)

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
