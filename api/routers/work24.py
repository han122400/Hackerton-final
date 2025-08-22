import os
import httpx
import xmltodict
from fastapi import APIRouter, HTTPException

router = APIRouter()

WORK24_KEY = os.getenv("WORK24_KEY")

if not WORK24_KEY:
    raise RuntimeError("WORK24_KEY is missing in environment")

L21 = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do"
D21 = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D21.do"


# 행정구역 정규화를 위한 매핑
REGION_MAPPINGS = {
    # 특별시/광역시
    "서울": "서울특별시", "서울시": "서울특별시",
    "부산": "부산광역시", "부산시": "부산광역시",
    "대구": "대구광역시", "대구시": "대구광역시",
    "인천": "인천광역시", "인천시": "인천광역시",
    "광주": "광주광역시", "광주시": "광주광역시",
    "대전": "대전광역시", "대전시": "대전광역시",
    "울산": "울산광역시", "울산시": "울산광역시",
    
    # 특별자치시/도
    "세종": "세종특별자치시", "세종시": "세종특별자치시",
    "강원": "강원특별자치도", "강원도": "강원특별자치도",
    
    # 도
    "경기": "경기도",
    "경남": "경상남도", "경상남": "경상남도",
    "경북": "경상북도", "경상북": "경상북도",
    "충남": "충청남도", "충청남": "충청남도",
    "충북": "충청북도", "충청북": "충청북도",
    "전남": "전라남도", "전라남": "전라남도",
    "전북": "전북특별자치도", "전라북": "전북특별자치도",
    "제주": "제주특별자치도", "제주도": "제주특별자치도"
}

def normalize_region(region_str: str) -> str:
    """지역명을 정규화된 형태로 변환"""
    if not region_str:
        return region_str

    # 띄어쓰기로 분리된 첫 부분을 기준으로 매핑 확인
    first_part = region_str.split()[0] if region_str.split() else region_str
    return REGION_MAPPINGS.get(first_part, region_str)

def parse_region(region_str: str):
    """근무지 문자열에서 시/도와 시군구를 추출"""
    if not region_str:
        return None, None
    
    parts = region_str.split()
    if not parts:
        return None, None

    # 시/도 정규화
    region1 = normalize_region(parts[0])
    region2 = None

    # 시군구 추출 (두 번째 부분부터 확인)
    if len(parts) > 1:
        # 시군구 식별을 위한 접미사
        suffixes = ['시', '군', '구']
        for part in parts[1:]:
            if any(part.endswith(suffix) for suffix in suffixes):
                region2 = part
                break

    return region1, region2

def _parse_list(json_obj: dict):
    root = json_obj.get("dhsOpenEmpInfoList") or {}
    rows = root.get("dhsOpenEmpInfo") or []
    if isinstance(rows, dict):
        rows = [rows]
    out = []
    for r in rows:
        region_str = r.get("empWantedWorkRegionNm", "")
        region1, region2 = parse_region(region_str)
        
        out.append({
            "empSeqno": r.get("empSeqno"),
            "title": r.get("empWantedTitle"),
            "company": r.get("empBusiNm"),
            "company_logo": r.get("regLogImgNm"),  # 회사 로고 URL 추가
            "endDate": r.get("empWantedEndt"),
            "region": region_str,
            "region1": region1,
            "region2": region2,
            "startDate": r.get("empWantedStdt"),
            "employmentType": r.get("empWantedTypeNm"),
        })
    return out

async def _fetch_xml(url: str, params: dict):
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        return xmltodict.parse(res.text)

async def get_jobs(keyword: str | None = None, region1: str | None = None, region2: str | None = None):
    base = dict(
        authKey=WORK24_KEY, callTp="L", returnType="XML",
        startPage="1", display="20", sortField="regDt", sortOrderBy="desc",
    )
    
    try:
        j1 = await _fetch_xml(L21, base)
        items = _parse_list(j1)
        if not items:
            base["callTp"] = "D"
            j2 = await _fetch_xml(D21, base)
            items = _parse_list(j2)
        
        # 지역 필터링 로직 개선
        if region1 or region2:
            filtered_items = []
            for item in items:
                item_region1 = item.get("region1")
                item_region2 = item.get("region2")
                
                if region1 and region2:
                    # 시/도와 시군구 모두 매칭
                    if item_region1 == region1 and item_region2 == region2:
                        filtered_items.append(item)
                elif region1:
                    # 시/도만 매칭
                    if item_region1 == region1:
                        filtered_items.append(item)
                elif region2:
                    # 시군구만 매칭
                    if item_region2 == region2:
                        filtered_items.append(item)
            items = filtered_items

        return {"ok": True, "items": items}
    except Exception as e:
        return {"ok": False, "items": [], "error": str(e)}

@router.get("/jobs/{emp_seqno}")
async def get_job_detail(emp_seqno: str):
    params = dict(authKey=WORK24_KEY, returnType="XML", callTp="D", empSeqno=emp_seqno)
    try:
        j = await _fetch_xml(D21, params)
        root = j.get("dhsOpenEmpInfoDetailRoot")
        if not root:
            raise HTTPException(404, "not_found")

        # 채용 모집 정보 처리
        recruitment_info = []
        if root.get("empRecrList", {}).get("empRecrListInfo"):
            recr_list = root["empRecrList"]["empRecrListInfo"]
            if isinstance(recr_list, dict):
                recr_list = [recr_list]
            for recr in recr_list:
                recruitment_info.append({
                    "title": recr.get("empRecrNm"),
                    "job_description": recr.get("jobCont"),
                    "selection_process": recr.get("selsCont"),
                    "work_location": recr.get("workRegionNm"),
                    "career": recr.get("empWantedCareerNm"),
                    "education": recr.get("empWantedEduNm"),
                    "other_requirements": recr.get("sptCertEtc"),
                    "headcount": recr.get("recrPsncnt"),
                    "note": recr.get("empRecrMemoCont")
                })

        # 전형 단계 정보 처리
        selection_steps = []
        if root.get("empSelsList", {}).get("empSelsListInfo"):
            sels_list = root["empSelsList"]["empSelsListInfo"]
            if isinstance(sels_list, dict):
                sels_list = [sels_list]
            for step in sels_list:
                selection_steps.append({
                    "name": step.get("selsNm"),
                    "schedule": step.get("selsSchdCont"),
                    "details": step.get("selsCont"),
                    "note": step.get("selsMemoCont")
                })

        normalized = {
            "id": root.get("empSeqno"),
            "title": root.get("empWantedTitle"),
            "company_name": root.get("empBusiNm"),
            "company_type": root.get("coClcdNm"),
            "period": {
                "start": root.get("empWantedStdt"),
                "end": root.get("empWantedEndt")
            },
            "employment_type": root.get("empWantedTypeNm"),
            "required_docs": root.get("empSubmitDocCont"),
            "application_method": root.get("empRcptMthdCont"),
            "announcement_date": root.get("empAcptPsnAnncCont"),
            "inquiry": root.get("inqryCont"),
            "other_info": root.get("empnEtcCont"),
            "company_logo": root.get("regLogImgNm"),
            "urls": {
                "homepage": root.get("empWantedHomepg"),
                "recruitment": root.get("empWantedHomepgDetail"),
                "mobile": root.get("empWantedMobileUrl")
            },
            "recruitment_summary": root.get("empnRecrSummaryCont"),
            "common_requirements": root.get("recrCommCont"),
            "recruitment_info": recruitment_info,
            "selection_steps": selection_steps,
            "raw": root
        }
        return {"ok": True, "item": normalized}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/jobs")
async def list_jobs(keyword: str | None = None, region1: str | None = None, region2: str | None = None):
    return await get_jobs(keyword, region1, region2)
    return await get_jobs(keyword, region1, region2)
