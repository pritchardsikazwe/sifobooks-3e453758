/**
 * Builders for the ZRA VSDC transaction shape.
 *
 * These builders intentionally require ZRA classification/unit/tax codes to
 * be supplied by the caller. SifoBooks must not guess regulatory codes.
 */

export type ZraSaleLine = {
  itemCd: string;
  itemClsCd: string;
  itemNm: string;
  pkgUnitCd: string;
  pkg?: number;
  qtyUnitCd: string;
  qty: number;
  prc: number;
  splyAmt: number;
  dcRt?: number;
  dcAmt?: number;
  vatCatCd: string;
  vatTaxblAmt: number;
  vatAmt: number;
  totAmt: number;
};

export type ZraSalePayloadInput = {
  tpin: string;
  bhfId: string;
  cisInvcNo: string;
  custTpin?: string | null;
  custNm?: string | null;
  salesTyCd?: string;
  rcptTyCd?: string;
  pmtTyCd?: string;
  salesSttsCd?: string;
  cfmDt: string;
  salesDt: string;
  totItemCnt: number;
  totTaxblAmt: number;
  totTaxAmt: number;
  totAmt: number;
  taxblAmtA?: number;
  taxblAmtB?: number;
  taxblAmtC1?: number;
  taxblAmtC2?: number;
  taxblAmtC3?: number;
  taxblAmtD?: number;
  taxblAmtRvat?: number;
  taxblAmtE?: number;
  taxblAmtF?: number;
  taxblAmtIpl1?: number;
  taxblAmtIpl2?: number;
  taxblAmtTl?: number;
  taxblAmtEcm?: number;
  taxblAmtExeeg?: number;
  taxblAmtTot?: number;
  taxRtA?: number;
  taxRtB?: number;
  taxRtC1?: number;
  taxRtC2?: number;
  taxRtC3?: number;
  taxRtD?: number;
  taxRtRvat?: number;
  taxRtE?: number;
  taxRtF?: number;
  taxRtIpl1?: number;
  taxRtIpl2?: number;
  taxRtTl?: number;
  taxRtEcm?: number;
  taxRtExeeg?: number;
  taxRtTot?: number;
  taxAmtA?: number;
  taxAmtB?: number;
  taxAmtC1?: number;
  taxAmtC2?: number;
  taxAmtC3?: number;
  taxAmtD?: number;
  taxAmtRvat?: number;
  taxAmtE?: number;
  taxAmtF?: number;
  taxAmtIpl1?: number;
  taxAmtIpl2?: number;
  taxAmtTl?: number;
  taxAmtEcm?: number;
  taxAmtExeeg?: number;
  taxAmtTot?: number;
  currencyTyCd?: string;
  exchangeRt?: string;
  remark?: string;
  regrId?: string;
  regrNm?: string;
  modrId?: string;
  modrNm?: string;
  itemList: ZraSaleLine[];
  [key: string]: unknown;
};

export function buildNormalSalePayload(input: ZraSalePayloadInput): Record<string, unknown> {
  return {
    orgInvcNo: 0,
    salesTyCd: "N",
    rcptTyCd: "S",
    pmtTyCd: "01",
    salesSttsCd: "02",
    currencyTyCd: "ZMW",
    exchangeRt: "1",
    taxblAmtA: 0,
    taxblAmtB: 0,
    taxblAmtC1: 0,
    taxblAmtC2: 0,
    taxblAmtC3: 0,
    taxblAmtD: 0,
    taxblAmtRvat: 0,
    taxblAmtE: 0,
    taxblAmtF: 0,
    taxblAmtIpl1: 0,
    taxblAmtIpl2: 0,
    taxblAmtTl: 0,
    taxblAmtEcm: 0,
    taxblAmtExeeg: 0,
    taxblAmtTot: 0,
    taxRtA: 16,
    taxRtB: 16,
    taxRtC1: 0,
    taxRtC2: 0,
    taxRtC3: 0,
    taxRtD: 0,
    taxRtRvat: 16,
    taxRtE: 0,
    taxRtF: 10,
    taxRtIpl1: 5,
    taxRtIpl2: 0,
    taxRtTl: 1.5,
    taxRtEcm: 5,
    taxRtExeeg: 3,
    taxRtTot: 0,
    taxAmtA: 0,
    taxAmtB: 0,
    taxAmtC1: 0,
    taxAmtC2: 0,
    taxAmtC3: 0,
    taxAmtD: 0,
    taxAmtRvat: 0,
    taxAmtE: 0,
    taxAmtF: 0,
    taxAmtIpl1: 0,
    taxAmtIpl2: 0,
    taxAmtTl: 0,
    taxAmtEcm: 0,
    taxAmtExeeg: 0,
    taxAmtTot: 0,
    prchrAcptcYn: "N",
    ...input,
    salesTyCd: input.salesTyCd ?? "N",
    rcptTyCd: input.rcptTyCd ?? "S",
    pmtTyCd: input.pmtTyCd ?? "01",
    salesSttsCd: input.salesSttsCd ?? "02",
    currencyTyCd: input.currencyTyCd ?? "ZMW",
    exchangeRt: input.exchangeRt ?? "1",
    itemList: input.itemList,
  };
}
