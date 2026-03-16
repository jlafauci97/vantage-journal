#!/usr/bin/env python3
"""
Scrape rental listing data from StreetEasy for NYC's five boroughs using Scrapling.

Uses StealthyFetcher with real_chrome=True to bypass anti-bot protection,
then extracts listing data from HTML listing cards.

StreetEasy is NYC-only: 14 listings per page, max 500 shown per borough search.

Usage:
    python3 scripts/scrape-streeteasy.py                        # all boroughs, 36 pages each
    python3 scripts/scrape-streeteasy.py --borough=Manhattan    # single borough
    python3 scripts/scrape-streeteasy.py --pages=10             # fewer pages per borough
    python3 scripts/scrape-streeteasy.py --dry-run              # preview without DB writes
"""

import re
import sys
import time
import argparse
from datetime import datetime

sys.path.insert(0, __import__("pathlib").Path(__file__).parent.__str__())
from db import (
    get_conn, match_building, create_building,
    upsert_rents, upsert_amenities, upsert_listing,
    detect_borough_from_city, detect_borough_from_zip,
    CITY_TO_BOROUGH,
)

from scrapling import StealthyFetcher

# ── CONSTANTS ────────────────────────────────────────────────────────────────
BOROUGH_URLS = {
    "Manhattan": "https://streeteasy.com/for-rent/manhattan",
    "Brooklyn": "https://streeteasy.com/for-rent/brooklyn",
    "Queens": "https://streeteasy.com/for-rent/queens",
    "Bronx": "https://streeteasy.com/for-rent/bronx",
    "Staten Island": "https://streeteasy.com/for-rent/staten-island",
}

MAX_RETRIES = 3
RETRY_DELAY = 5
PAGE_DELAY = 4
LISTINGS_PER_PAGE = 14
MAX_SHOWN = 500
SOURCE = "streeteasy"


# ── PARSING HELPERS ──────────────────────────────────────────────────────────
def parse_price(text: str) -> int | None:
    if not text:
        return None
    match = re.search(r'\$?([\d,]+)', text.replace(",", "").replace(" ", ""))
    if not match:
        match = re.search(r'\$?([\d,]+)', text)
    if match:
        raw = match.group(1).replace(",", "")
        try:
            val = int(raw)
            if 200 <= val <= 100000:
                return val
        except ValueError:
            pass
    return None


def parse_beds(text: str) -> int | None:
    if not text:
        return None
    lower = text.lower().strip()
    if "studio" in lower:
        return 0
    match = re.search(r'(\d+)\s*(?:bed|br|bd)', lower)
    if match:
        return int(match.group(1))
    match = re.match(r'^(\d+)$', lower.strip())
    if match:
        return int(match.group(1))
    return None


def parse_baths(text: str) -> float | None:
    if not text:
        return None
    match = re.search(r'([\d.]+)\s*(?:bath|ba)', text.lower())
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None


def parse_sqft(text: str) -> int | None:
    if not text:
        return None
    cleaned = text.replace(",", "")
    match = re.search(r'([\d]+)\s*(?:ft|sf|sq)', cleaned.lower())
    if match:
        try:
            val = int(match.group(1))
            if 50 <= val <= 50000:
                return val
        except ValueError:
            pass
    return None


def detect_borough(listing: dict, default_borough: str = "Manhattan") -> str:
    neighborhood = listing.get("neighborhood", "").lower()
    for key, boro in CITY_TO_BOROUGH.items():
        if key in neighborhood:
            return boro

    address = listing.get("address", "").lower()
    for key, boro in CITY_TO_BOROUGH.items():
        if key in address:
            return boro

    zc = listing.get("zip_code", "")
    if zc:
        return detect_borough_from_zip(zc)

    return default_borough


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


def extract_listings_from_html(page, default_borough: str) -> list[dict]:
    listings = []
    cards = page.css('[data-testid*="listing"]')
    if not cards or len(cards) == 0:
        cards = page.css('.listingCard, .listing-card, [class*="ListingCard"], [class*="searchCardList"] > li, [class*="listing-card"]')
    if not cards or len(cards) == 0:
        print("    No listing cards found on page.")
        return []

    for card in cards:
        try:
            listing = parse_listing_card(card, default_borough)
            if listing and listing.get("address"):
                listings.append(listing)
        except Exception as e:
            print(f"    Error parsing listing card: {e}")
            continue

    return listings


def parse_listing_card(card, default_borough: str) -> dict | None:
    # ── Address
    address = ""
    addr_el = card.css('[data-testid*="address"], [class*="address"], .listingCard-address, address')
    if addr_el and len(addr_el) > 0:
        address = addr_el[0].text.strip()

    if not address:
        links = card.css("a")
        for link in links:
            href = link.attrib.get("href", "")
            text = link.text.strip()
            if href and ("/building/" in href or "/rental/" in href):
                if text and not text.startswith("$"):
                    address = text
                    break

    if not address:
        headings = card.css("h2, h3, h4, .title, [class*='title']")
        for h in headings:
            text = h.text.strip()
            if text and not text.startswith("$") and any(c.isdigit() for c in text[:5]):
                address = text
                break

    if not address:
        return None

    # ── Listing URL
    listing_url = ""
    links = card.css("a")
    for link in links:
        href = link.attrib.get("href", "")
        if href and ("/rental/" in href or "/building/" in href or "/for-rent/" in href):
            listing_url = f"https://streeteasy.com{href}" if not href.startswith("http") else href
            break
    if not listing_url and links and len(links) > 0:
        href = links[0].attrib.get("href", "")
        if href:
            listing_url = f"https://streeteasy.com{href}" if not href.startswith("http") else href

    # ── Price
    price = None
    price_text = ""
    price_el = card.css('span[class*="price"], span[class*="Price"]')
    if not price_el:
        price_el = card.css('[data-testid*="price"], [class*="price"], .listingCard-price, .price')
    if price_el:
        for pel in price_el:
            t = pel.text.strip() if pel.text else ""
            if t and "$" in t:
                price_text = t
                price = parse_price(price_text)
                break

    if price is None:
        all_els = card.css("span, p, div")
        for el in all_els:
            t = el.text.strip() if el.text else ""
            if t and "$" in t:
                price_match = re.search(r'\$[\d,]+', t)
                if price_match:
                    price_text = price_match.group(0)
                    price = parse_price(price_text)
                    if price is not None:
                        break

    # ── Beds / Baths / Sqft
    beds = None
    baths = None
    sqft = None
    beds_text = ""
    baths_text = ""
    sqft_text = ""

    bed_el = card.css('[data-testid*="bed"], [class*="bed"]')
    if bed_el and len(bed_el) > 0:
        beds_text = bed_el[0].text.strip()
        beds = parse_beds(beds_text)

    bath_el = card.css('[data-testid*="bath"], [class*="bath"]')
    if bath_el and len(bath_el) > 0:
        baths_text = bath_el[0].text.strip()
        baths = parse_baths(baths_text)

    sqft_el = card.css('[data-testid*="sqft"], [data-testid*="size"], [class*="sqft"], [class*="size"]')
    if sqft_el and len(sqft_el) > 0:
        sqft_text = sqft_el[0].text.strip()
        sqft = parse_sqft(sqft_text)

    if beds is None or baths is None:
        detail_els = card.css('[class*="detail"], [class*="info"], .listingCard-details, li, span')
        for el in detail_els:
            text = el.text.strip().lower()
            if beds is None and ("bed" in text or "studio" in text or "br" in text):
                beds_text = el.text.strip()
                beds = parse_beds(beds_text)
            if baths is None and ("bath" in text or "ba" in text):
                baths_text = el.text.strip()
                baths = parse_baths(baths_text)
            if sqft is None and ("ft" in text or "sq" in text or "sf" in text):
                sqft_text = el.text.strip()
                sqft = parse_sqft(sqft_text)

    if beds is None or baths is None or sqft is None:
        full_text = card.text
        if beds is None:
            if "studio" in full_text.lower():
                beds = 0
                beds_text = "Studio"
            else:
                m = re.search(r'(\d+)\s*(?:bed|br|bd)', full_text, re.IGNORECASE)
                if m:
                    beds = int(m.group(1))
                    beds_text = m.group(0)
        if baths is None:
            m = re.search(r'([\d.]+)\s*(?:bath|ba)', full_text, re.IGNORECASE)
            if m:
                try:
                    baths = float(m.group(1))
                    baths_text = m.group(0)
                except ValueError:
                    pass
        if sqft is None:
            m = re.search(r'([\d,]+)\s*(?:ft|sf|sq)', full_text, re.IGNORECASE)
            if m:
                sqft = parse_sqft(m.group(0))
                sqft_text = m.group(0)

    # ── Neighborhood
    neighborhood = ""
    nbhd_el = card.css('[data-testid*="neighborhood"], [class*="neighborhood"], [class*="subtitle"], .listingCard-neighborhood')
    if nbhd_el and len(nbhd_el) > 0:
        neighborhood = nbhd_el[0].text.strip()

    # ── Amenities
    amenities = []
    amenity_els = card.css('[data-testid*="amenity"], [class*="amenity"], [class*="tag"], [class*="badge"], [class*="perk"]')
    for el in amenity_els:
        text = el.text.strip()
        if text and len(text) < 60:
            amenities.append(text)

    # ── No-fee badge
    no_fee = False
    fee_els = card.css('[class*="no-fee"], [class*="noFee"], [data-testid*="no-fee"]')
    if fee_els and len(fee_els) > 0:
        no_fee = True
    elif "no fee" in card.text.lower():
        no_fee = True

    # ── Build rent_by_beds
    rent_by_beds = {}
    if price and beds is not None:
        rent_by_beds[beds] = {
            "min_rent": price,
            "max_rent": price,
            "sqft_min": sqft,
            "sqft_max": sqft,
        }

    # ── Zip code from address
    zip_code = ""
    zip_match = re.search(r'\b(\d{5})\b', address)
    if zip_match:
        zip_code = zip_match.group(1)

    clean_address = address
    if zip_code:
        clean_address = address.replace(zip_code, "").strip().rstrip(",").strip()

    borough = detect_borough({
        "neighborhood": neighborhood,
        "address": address,
        "zip_code": zip_code,
    }, default_borough)

    return {
        "address": clean_address,
        "address_full": address,
        "zip_code": zip_code,
        "neighborhood": neighborhood,
        "borough": borough,
        "latitude": None,
        "longitude": None,
        "property_type": "apartment",
        "listing_url": listing_url,
        "amenities": amenities,
        "rent_by_beds": rent_by_beds,
        "listing_name": clean_address,
        "price_min": price,
        "price_max": price,
        "price_text": price_text,
        "bed_min": beds,
        "bed_max": beds,
        "bath_min": int(baths) if baths else None,
        "bath_max": int(baths) if baths else None,
        "sqft_min": sqft,
        "sqft_max": sqft,
        "bed_text": beds_text,
        "bath_text": baths_text,
        "sqft_text": sqft_text,
        "units_available": 1,
        "units_available_text": "1 unit",
        "availability_status": "available",
        "management_company": None,
        "verified": False,
        "has_price_drops": False,
        "listing_views": None,
        "updated_at_source": None,
        "floor_plans": [],
        "bed_price_data": [],
        "office_hours": [],
        "no_fee": no_fee,
    }


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Scrape StreetEasy for NYC rent & amenity data")
    parser.add_argument("--borough", type=str, default="", help="Single borough to scrape")
    parser.add_argument("--pages", type=int, default=36, help="Pages per borough (14 listings/page, max ~36)")
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

    print(f"Scraping StreetEasy -- boroughs={list(boroughs.keys())}, pages={max_pages}, dry_run={dry_run}")
    print(f"Start time: {datetime.now()}\n")

    for borough, base_url in boroughs.items():
        print(f"\n{'='*60}")
        print(f"BOROUGH: {borough}")
        print(f"{'='*60}")

        for page_num in range(args.start_page, args.start_page + max_pages):
            url = base_url if page_num == 1 else f"{base_url}?page={page_num}"
            print(f"\n  Page {page_num}: {url}")

            page = fetch_page(url)
            if page is None:
                print(f"    FAILED to fetch page {page_num} after {MAX_RETRIES} retries. Skipping.")
                continue

            listings = extract_listings_from_html(page, borough)
            print(f"    Got {len(listings)} listings")

            if len(listings) == 0:
                print(f"    No more listings. Moving to next borough.")
                break

            total_listings += len(listings)

            for listing in listings:
                addr = listing["address"]
                beds = listing.get("bed_min")
                price = listing.get("price_min")
                beds_display = "Studio" if beds == 0 else f"{beds}BR" if beds is not None else "?"
                price_display = f"${price:,}" if price else "?"

                if dry_run:
                    print(f"    [DRY RUN] {addr} | {beds_display} | {price_display} | amenities={len(listing['amenities'])}")
                    continue

                street = listing["address"]
                zip_code = listing["zip_code"]
                boro = listing["borough"]

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

            if page_num * LISTINGS_PER_PAGE >= MAX_SHOWN:
                print(f"    Reached StreetEasy display limit ({MAX_SHOWN} listings). Moving to next borough.")
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
