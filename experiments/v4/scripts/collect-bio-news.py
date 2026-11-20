"""Collect public metadata for the WorkflowKR news cards."""

import argparse
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import json
from pathlib import Path
import re
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

FEED_ERRORS = (OSError, ValueError, KeyError, TypeError, ET.ParseError)


def read_url(url, accept):
    request = Request(url, headers={"User-Agent": "WorkflowKR-BioNews/4", "Accept": accept})
    with urlopen(request, timeout=15) as response:
        data = response.read(2_000_001)
    if len(data) > 2_000_000:
        raise ValueError("Feed response is larger than 2 MB")
    return data


def read_json(url):
    return json.loads(read_url(url, "application/json"))


def ncbi_items():
    host = "ncbiinsights.ncbi.nlm.nih.gov"
    feed = ET.fromstring(read_url(f"https://{host}/feed/", "application/rss+xml"))
    if feed.find("channel") is None:
        raise ValueError("Expected an RSS channel")
    items = []
    for post in feed.findall("channel/item"):
        title = " ".join(post.findtext("title", "").split())
        url = post.findtext("link", "").strip()
        published = post.findtext("pubDate", "").strip()
        if not (title and url and published):
            continue
        if urlsplit(url).scheme != "https" or urlsplit(url).hostname != host:
            continue
        if not re.search(r"\b(?:RefSeq|GenBank|GEO|SRA|RNA.Seq|Datasets?|Annotation|Tool(?:s|kit)?|PubMed|MedGen|dbGaP)\b", title, re.I):
            continue
        items.append({
            "category": "data",
            "source": "NCBI Insights",
            "published_on": parsedate_to_datetime(published).date().isoformat(),
            "title": title,
            "url": url,
        })
    return items[:8]


def release_items(repository, source):
    release = read_json(f"https://api.github.com/repos/{repository}/releases/latest")
    return [{
        "category": "tool",
        "source": source,
        "published_on": release["published_at"][:10],
        "title": f'{source} {release["tag_name"].removeprefix("v")}',
        "url": release["html_url"],
    }]


def europe_pmc_items(today):
    start = today - timedelta(days=60)
    query = (
        '(TITLE_ABS:Nextflow OR TITLE_ABS:"workflow reproducibility" '
        'OR TITLE_ABS:"reproducible workflow" OR TITLE:"spatial transcriptomics") '
        f'AND SRC:MED AND FIRST_PDATE:[{start} TO {today}] sort_date:y'
    )
    params = urlencode({"query": query, "format": "json", "resultType": "lite", "pageSize": 12})
    response = read_json(f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?{params}")
    return [
        {
            "category": "paper",
            "source": "Europe PMC",
            "published_on": record["firstPublicationDate"],
            "title": " ".join(record["title"].split()),
            "url": f'https://europepmc.org/article/MED/{record["id"]}',
        }
        for record in response["resultList"]["result"]
        if record.get("id", "").isdigit() and record.get("firstPublicationDate") and record.get("title")
    ]


def pubmed_items():
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    search_params = urlencode({
        "db": "pubmed",
        "term": 'Nextflow[tiab] OR "workflow reproducibility"[tiab] OR "spatial transcriptomics"[ti]',
        "reldate": 60,
        "datetype": "pdat",
        "sort": "pub_date",
        "retmax": 12,
        "retmode": "json",
        "tool": "workflowkr-bio-news",
    })
    ids = read_json(f"{base}esearch.fcgi?{search_params}")["esearchresult"]["idlist"]
    if not ids:
        return []
    summary_params = urlencode({"db": "pubmed", "id": ",".join(ids), "retmode": "json"})
    records = read_json(f"{base}esummary.fcgi?{summary_params}")["result"]
    items = []
    for pmid in ids:
        record = records.get(pmid, {})
        title = " ".join(record.get("title", "").split())
        if not title:
            continue
        for date_text in (record.get("epubdate", ""), record.get("pubdate", "")):
            try:
                published = datetime.strptime(date_text, "%Y %b %d").date().isoformat()
            except ValueError:
                continue
            items.append({
                "category": "paper",
                "source": "PubMed",
                "published_on": published,
                "title": title,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            })
            break
    return items


def paper_items(today):
    try:
        return europe_pmc_items(today)
    except FEED_ERRORS as error:
        print(f"Europe PMC unavailable ({error}); checking PubMed.")
        return pubmed_items()


def collect(now):
    sources = {
        "NCBI Insights": ncbi_items,
        "Nextflow": lambda: release_items("nextflow-io/nextflow", "Nextflow"),
        "nf-core/tools": lambda: release_items("nf-core/tools", "nf-core/tools"),
        "Europe PMC / PubMed": lambda: paper_items(now.date()),
    }
    items = {}
    errors = {}
    for name, get_items in sources.items():
        try:
            for item in get_items():
                items[item["url"]] = item
        except FEED_ERRORS as error:
            errors[name] = str(error)

    return {
        "collected_at": now.isoformat(timespec="seconds"),
        "items": sorted(items.values(), key=lambda item: (item["published_on"], item["title"]), reverse=True),
        "source_errors": errors,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = collect(datetime.now(timezone.utc))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f'Collected {len(result["items"])} stories. Sources with errors: {", ".join(result["source_errors"]) or "none"}.')
    if not result["items"] and result["source_errors"]:
        raise SystemExit("No candidates were collected. See the source errors in the output file.")


if __name__ == "__main__":
    main()
