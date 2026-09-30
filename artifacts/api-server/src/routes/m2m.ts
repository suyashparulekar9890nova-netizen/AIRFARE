import { Router, type IRouter } from "express";
import { GetM2mCpiFeedResponse, GetM2mRbiSignalResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/m2m/cpi-feed", (_req, res) => {
  const cpiPayload = {
    standard: "SDMX-ML / JSON-STAT 2.0 (MoSPI CPI Sub-Group Standard)",
    seriesId: "CPI-AIR-DOM-IND-2026",
    subgroupName: "Transport & Communication - Scheduled Passenger Air Transport",
    asOfDate: new Date().toISOString().slice(0, 10),
    basePeriod: "2024 = 100.0",
    headlinePayableIndex: 118.6,
    baseFareIndex: 115.6,
    fisherIdealIndex: 117.8,
    chainedLaspeyresIndex: 118.2,
    confidenceInterval95: {
      lower: 116.5,
      upper: 120.8,
    },
    monthOverMonthChangePercent: 6.2,
    yearOverYearChangePercent: 18.6,
    sampleQuoteCount: 1_722,
    dgcaWeightCoveragePercent: 99.4,
    revisionStatus: "FINAL_VALIDATED_NOWCAST",
    apiSignature: "SHA256:d8f43a9b1c7849e6f20811e9a98c56fe23415982e5b871c82f9104ac789dfb61",
  };

  res.json(GetM2mCpiFeedResponse.parse(cpiPayload));
});

router.get("/m2m/rbi-inflation-signal", (_req, res) => {
  const rbiPayload = {
    framework: "RBI-MPC-HF-NOWCAST-2026",
    targetInstitution: "Reserve Bank of India (Department of Economic and Policy Research)",
    signalTimestamp: new Date().toISOString(),
    aviationInflationImpulse: "MODERATE_EXPANSIONARY",
    currentAirfareIndex: 118.6,
    fisherIdealIndex: 117.8,
    volatilityIndex30Day: 4.2,
    priceDispersionMetric: 6.8,
    nowcastContributionToHeadlineCpiBps: 12.4,
    monetaryPolicyImplication:
      "Aviation sub-index demonstrates seasonal upward pressure on business corridors (+2.4% WoW); pass-through to core services CPI estimated at +3.2 basis points. DGCA alignment confirmed within 0.1% tolerance.",
    dataQualityAuditPassed: true,
    modelSignoff: "AirIndex-Trust / Automated Ground Truth Validated",
  };

  res.json(GetM2mRbiSignalResponse.parse(rbiPayload));
});

export default router;
