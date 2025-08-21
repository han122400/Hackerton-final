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


def _parse_list(json_obj: dict):
    root = json_obj.get("dhsOpenEmpInfoList") or {}
    rows = root.get("dhsOpenEmpInfo") or []
    if isinstance(rows, dict):
        rows = [rows]
    out = []
    for r in rows:
        out.append({
            "empSeqno": r.get("empSeqno"),
            "title": r.get("empWantedTitle"),
            "company": r.get("empBusiNm"),
            "endDate": r.get("empWantedEndt"),
            "region": r.get("empWantedWorkRegionNm"),
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
    # keyword/region 파라미터를 Work24 쿼리로 매핑하고 싶으면 여기서 변환
    base = dict(
        authKey=WORK24_KEY, callTp="L", returnType="XML",
        startPage="1", display="20", sortField="regDt", sortOrderBy="desc",
    )
    try:
        j1 = await _fetch_xml(L21, base)
        items = _parse_list(j1)
        if not items:
            # D20 대신 D21 사용
            base["callTp"] = "D"  # D21 API는 callTp를 D로 설정
            j2 = await _fetch_xml(D21, base)
            items = _parse_list(j2)
        return {"ok": True, "items": items}
    except Exception as e:
        # 오류 발생 시 빈 리스트 반환
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
