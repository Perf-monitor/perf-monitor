import logging
import requests
from django.conf import settings
from .models import PerformanceReport

logger = logging.getLogger(__name__)


def fetch_pagespeed_report(url: str, strategy: str = "mobile", api_key: str = None) -> dict:
    """Fetch Lighthouse report from Google PageSpeed Insights API."""
    params = {
        "url": url,
        "strategy": strategy,
        "category": ["performance", "accessibility", "seo", "best-practices"],
    }
    if api_key:
        params["key"] = api_key

    try:
        response = requests.get(
            settings.PAGESPEED_API_URL,
            params=params,
            timeout=120,
        )
        response.raise_for_status()
        return response.json()
    except requests.Timeout:
        logger.error(f"PageSpeed API timeout for {url} ({strategy})")
        raise
    except requests.RequestException as e:
        logger.error(f"PageSpeed API error for {url} ({strategy}): {e}")
        raise


def parse_pagespeed_response(data: dict, project, strategy: str) -> PerformanceReport:
    """Parse Google PageSpeed API response and create a PerformanceReport."""
    categories = data.get("lighthouseResult", {}).get("categories", {})
    audits = data.get("lighthouseResult", {}).get("audits", {})

    def score(key):
        cat = categories.get(key, {})
        s = cat.get("score")
        return round(s * 100, 1) if s is not None else 0

    def audit_val(key, sub="numericValue"):
        audit = audits.get(key, {})
        return audit.get(sub)

    performance_score = score("performance")
    accessibility_score = score("accessibility")
    seo_score = score("seo")
    best_practices_score = score("best-practices")

    lcp = audit_val("largest-contentful-paint")
    cls = audit_val("cumulative-layout-shift")
    inp = audit_val("interaction-to-next-paint")
    fcp = audit_val("first-contentful-paint")
    ttfb = audit_val("server-response-time")
    speed_index = audit_val("speed-index")
    tbt = audit_val("total-blocking-time")

    # Bonus metrics
    unused_js = audit_val("unused-javascript", "details")
    unused_css_audit = audit_val("unused-css-rules", "details")
    render_blocking = audit_val("render-blocking-resources", "details")

    uses_optimized_images = audits.get("uses-optimized-images", {}).get("score")
    uses_text_compression = audits.get("uses-text-compression", {}).get("score")

    report = PerformanceReport.objects.create(
        project=project,
        performance_score=performance_score,
        accessibility_score=accessibility_score,
        seo_score=seo_score,
        best_practices_score=best_practices_score,
        lcp=lcp,
        cls=cls,
        inp=inp,
        fcp=fcp,
        ttfb=ttfb,
        speed_index=speed_index,
        total_blocking_time=tbt,
        strategy=strategy,
        image_optimization_score=round(uses_optimized_images * 100, 1) if uses_optimized_images is not None else None,
        compression_enabled=uses_text_compression == 1.0 if uses_text_compression is not None else None,
        raw_response=data,
    )

    logger.info(
        f"Saved report for {project.name} ({strategy}): "
        f"perf={performance_score}, a11y={accessibility_score}, seo={seo_score}"
    )
    return report


def run_scan_for_project(project, api_key: str = None) -> list:
    """Run Lighthouse scan for a project (mobile and/or desktop)."""
    if api_key is None:
        api_key = settings.GOOGLE_PAGESPEED_API_KEY

    reports = []
    strategies = []
    if project.scan_mobile:
        strategies.append("mobile")
    if project.scan_desktop:
        strategies.append("desktop")

    for strategy in strategies:
        try:
            data = fetch_pagespeed_report(project.url, strategy=strategy, api_key=api_key)
            report = parse_pagespeed_response(data, project, strategy)
            reports.append(report)
        except Exception as e:
            logger.error(f"Failed to scan {project.name} ({strategy}): {e}")

    return reports
