import os
import time
import asyncio
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

try:
    import xmltodict
except Exception:
    xmltodict = None

router = APIRouter()

WORK24_KEY = os.getenv("WORK24_KEY") or os.getenv("WORKNET_KEY") or ""
LIST_URL   = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do"
DETAIL_URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D21.do"

# ----------------- 간단 캐시 (empSeqno -> (ts, workRegionNm)) -----------------
_REGION_CACHE: Dict[str, Tuple[float, str]] = {}
REGION_TTL_SEC = 24 * 3600

def _cache_get(emp_seq: str) -> Optional[str]:
    rec = _REGION_CACHE.get(emp_seq)
    if not rec:
        return None
    ts, val = rec
    if time.time() - ts > REGION_TTL_SEC:
        return None
    return val

def _cache_set(emp_seq: str, val: str):
    _REGION_CACHE[emp_seq] = (time.time(), val or "")

# ----------------- 공통 유틸 -----------------
def _xml_to_dict(text: str) -> Dict[str, Any]:
    if not xmltodict:
        return {}
    try:
        return xmltodict.parse(text)
    except Exception:
        return {}

def _get_first(d: Any, *keys) -> Any:
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return None
    return cur

def _ensure_list(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]

def _simplify_list_item(it: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "empSeqno": it.get("empSeqno") or it.get("id"),
        "title": it.get("empWantedTitle") or it.get("title"),
        "company": it.get("empBusiNm") or it.get("company"),
        "endDate": it.get("empWantedEndt") or it.get("endDate"),
        "startDate": it.get("empWantedStdt") or it.get("startDate"),
        "empWantedTypeNm": it.get("empWantedTypeNm"),
        "regLogImgNm": it.get("regLogImgNm"),
        "empWantedHomepgDetail": it.get("empWantedHomepgDetail"),
        "empWantedMobileUrl": it.get("empWantedMobileUrl"),
        # workRegionNm은 아래 enrich 단계에서 채움
    }

# ----------------- 목록 -----------------
async def _fetch_list(client: httpx.AsyncClient, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    q = {
        "authKey": WORK24_KEY,
        "callTp": "L",
        "returnType": "XML",
        "startPage": params.get("startPage", 1),
        "display": params.get("display", 20),
    }
    if params.get("keyword"):
        q["empWantedTitle"] = params["keyword"]

    r = await client.get(LIST_URL, params=q, timeout=20)
    r.raise_for_status()
    data = _xml_to_dict(r.text) or {}
    items = _get_first(data, "dhsOpenEmpInfoList", "dhsOpenEmpInfo")
    items = _ensure_list(items)
    return [_simplify_list_item(it) for it in items]

# ----------------- 상세 파싱 -----------------
def _parse_work_regions(detail_root: Dict[str, Any]) -> str:
    # empRecrList/empRecrListInfo/workRegionNm[*]
    src = _get_first(detail_root, "empRecrList", "empRecrListInfo") or detail_root.get("empRecrListInfo")
    arr = _ensure_list(src)
    regions: List[str] = []
    for it in arr:
        w = (it or {}).get("workRegionNm")
        if w:
            w = str(w).strip()
            if w and w not in regions:
                regions.append(w)
    return "·".join(regions[:2]) if regions else ""

def _parse_selfintro_questions(detail_root: Dict[str, Any]) -> List[str]:
    """
    empSelsList/empSelsListInfo/selfintroQstCont[*] 에서 모든 문항 수집
    """
    out: List[str] = []

    # 루트 아래 다양한 위치를 전부 탐색
    cand1 = _ensure_list(detail_root.get("empSelsList"))
    cand2 = _ensure_list(detail_root.get("empSelsListInfo"))
    buckets = [*cand1, *cand2]

    for b in buckets:
        infos = _ensure_list(b.get("empSelsListInfo") if isinstance(b, dict) else b)
        for inf in infos:
            qs = _ensure_list((inf or {}).get("selfintroQstCont"))
            for q in qs:
                s = str(q or "").strip()
                if s and s not in out:
                    out.append(s)
    return out

# ----------------- 상세: 근무지만 빠르게 캐싱 -----------------
async def _fetch_detail_for_region(client: httpx.AsyncClient, emp_seq: str) -> str:
    hit = _cache_get(emp_seq)
    if hit is not None:
        return hit

    q = {"authKey": WORK24_KEY, "returnType": "XML", "callTp": "D", "empSeqno": emp_seq}
    r = await client.get(DETAIL_URL, params=q, timeout=25)
    if r.status_code != 200:
        _cache_set(emp_seq, "")
        return ""
    data = _xml_to_dict(r.text) or {}
    root = _get_first(data, "dhsOpenEmpInfoDetailRoot") or {}
    val = _parse_work_regions(root)
    _cache_set(emp_seq, val)
    return val

async def _enrich_regions(items: List[Dict[str, Any]], concurrency: int = 6):
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient() as client:
        async def worker(job: Dict[str, Any]):
            emp_seq = job.get("empSeqno")
            if not emp_seq:
                return
            async with sem:
                try:
                    job["workRegionNm"] = await _fetch_detail_for_region(client, emp_seq)
                except Exception:
                    job["workRegionNm"] = ""

        await asyncio.gather(*(worker(it) for it in items))

# ----------------- 라우트 -----------------
@router.get("/jobs")
async def get_jobs(
    startPage: int = Query(1, ge=1, le=1000),
    display: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = None,
    region1: Optional[str] = None,
):
    """
    공채속보 목록 + 상세 근무지 합성
    """
    if not WORK24_KEY:
        return JSONResponse({"ok": False, "detail": "WORK24_KEY not configured"}, status_code=500)

    params = {"startPage": startPage, "display": display, "keyword": keyword, "region1": region1}

    try:
        async with httpx.AsyncClient() as client:
            items = await _fetch_list(client, params)

        # 근무지 합성
        await _enrich_regions(items, concurrency=6)

        # region1이 들어오면 간단 정규화해서 필터
        if region1:
            def norm(s: str) -> str:
                rep = {
                    "서울특별시": "서울","경기도": "경기","경상남도":"경남","경상북도":"경북",
                    "충청남도":"충남","충청북도":"충북","전라남도":"전남","전라북도":"전북",
                    "강원특별자치도":"강원","제주특별자치도":"제주","부산광역시":"부산",
                    "대구광역시":"대구","인천광역시":"인천","광주광역시":"광주",
                    "대전광역시":"대전","울산광역시":"울산","세종특별자치시":"세종",
                }
                for k,v in rep.items():
                    if k in s: return v
                return s
            want = norm(region1)
            items = [it for it in items if it.get("workRegionNm") and norm(it["workRegionNm"]).find(want) != -1]

        return {"ok": True, "items": items}

    except Exception as e:
        return JSONResponse({"ok": False, "detail": str(e)}, status_code=500)

@router.get("/jobs/{emp_seqno}")
async def get_job_detail(emp_seqno: str):
    """
    단일 상세: workRegionNm + selfintroQstList 를 항상 포함해서 반환
    + 헤더에서 바로 쓰기 좋은 필드(title/company/endDate/logo/link 등)도 같이 제공
    """
    if not WORK24_KEY:
        return JSONResponse({"ok": False, "detail": "WORK24_KEY not configured"}, status_code=500)

    try:
        async with httpx.AsyncClient() as client:
            q = {"authKey": WORK24_KEY, "returnType": "XML", "callTp": "D", "empSeqno": emp_seqno}
            r = await client.get(DETAIL_URL, params=q, timeout=25)
            r.raise_for_status()
            data = _xml_to_dict(r.text) or {}

        root = _get_first(data, "dhsOpenEmpInfoDetailRoot") or {}

        # ===== 보장 필드 =====
        work_region = _parse_work_regions(root)
        selfintro_list = _parse_selfintro_questions(root)

        # ===== 헤더/요약에 바로 쓰기 좋은 필드 =====
        item_title   = root.get("empWantedTitle") or ""
        item_company = root.get("empBusiNm") or ""
        item_end     = root.get("empWantedEndt") or ""
        item_logo    = root.get("regLogImgNm") or ""
        item_type    = root.get("empWantedTypeNm") or ""
        item_web     = root.get("empWantedHomepgDetail") or ""
        item_mob     = root.get("empWantedMobileUrl") or ""

        return {
            "ok": True,
            "item": {
                # 프론트에서 바로 쓸 필드
                "empSeqno": emp_seqno,
                "title": item_title,
                "company": item_company,
                "endDate": item_end,
                "regLogImgNm": item_logo,
                "empWantedTypeNm": item_type,
                "empWantedHomepgDetail": item_web,
                "empWantedMobileUrl": item_mob,

                # 🔹 보장: 근무지/자소서
                "workRegionNm": work_region,           # 예: "서울·경기"
                "selfintroQstList": selfintro_list,    # 예: ["성장과정...", "지원동기..."]

                # 원본 전체: 추가 파싱용
                "raw": data,
            },
        }

    except Exception as e:
        return JSONResponse({"ok": False, "detail": str(e)}, status_code=500)
