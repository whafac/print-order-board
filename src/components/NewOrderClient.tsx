"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const REQUESTER_KEY = "print_order_requester_name";

function getStoredRequester(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REQUESTER_KEY) ?? "";
}

function setStoredRequester(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REQUESTER_KEY, name);
}

const MEDIA_OTHER = "other";

const SHEET_FINISHING_OPTIONS = [
  "무광코팅",
  "유광코팅",
  "에폭시",
  "박",
  "형압",
  "도무송",
  "오시",
  "미싱",
  "접지",
  "넘버링",
] as const;

interface Spec {
  media_id: string;
  media_name: string;
  default_vendor: string;
  trim_size: string;
  cover_type: string;
  cover_paper: string;
  cover_print: string;
  inner_pages: string;
  inner_paper: string;
  inner_print: string;
  binding: string;
  finishing: string;
  packaging_delivery: string;
  file_rule: string;
  additional_inner_pages?: string; // JSON 문자열
  // 하위 호환
  pages?: string;
  print_color?: string;
}

interface Vendor {
  vendor_id: string;
  vendor_name: string;
  is_active: string;
}

export function NewOrderClient() {
  const router = useRouter();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orderType, setOrderType] = useState<"book" | "sheet">("book");
  const [requesterName, setRequesterName] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [vendor, setVendor] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [qty, setQty] = useState("");
  const [fileLink, setFileLink] = useState("");
  const [changesNote, setChangesNote] = useState("");
  const [spec, setSpec] = useState<Spec | null>(null);
  const [bookOrdererName, setBookOrdererName] = useState("");
  const [bookOtherMediaName, setBookOtherMediaName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<"ok" | "err" | null>(null);
  const previewWindowRef = useRef<Window | null>(null);

  // 책자 전용 제작사양 (수정 가능)
  const [trimSize, setTrimSize] = useState("");
  const [coverType, setCoverType] = useState("");
  const [coverPaper, setCoverPaper] = useState("");
  const [coverPrint, setCoverPrint] = useState("");
  const [innerPages, setInnerPages] = useState("");
  const [innerPaper, setInnerPaper] = useState("");
  const [innerPrint, setInnerPrint] = useState("");
  const [binding, setBinding] = useState("");
  const [finishingSpec, setFinishingSpec] = useState("");
  const [packagingDelivery, setPackagingDelivery] = useState("");
  const [fileRule, setFileRule] = useState("");

  // 추가 내지 항목
  interface AdditionalInnerPage {
    type: string;
    pages: string;
    paper: string;
    print: string;
  }
  const [additionalInnerPages, setAdditionalInnerPages] = useState<AdditionalInnerPage[]>([]);

  // 기본값 저장 (변경 감지용)
  const [defaultValues, setDefaultValues] = useState<{
    trimSize: string;
    coverType: string;
    coverPaper: string;
    coverPrint: string;
    innerPages: string;
    innerPaper: string;
    innerPrint: string;
    binding: string;
    finishingSpec: string;
    packagingDelivery: string;
    fileRule: string;
    additionalInnerPages: AdditionalInnerPage[];
  }>({
    trimSize: "",
    coverType: "",
    coverPaper: "",
    coverPrint: "",
    innerPages: "",
    innerPaper: "",
    innerPrint: "",
    binding: "",
    finishingSpec: "",
    packagingDelivery: "",
    fileRule: "",
    additionalInnerPages: [],
  });

  // 값이 변경되었는지 확인하는 함수
  function isFieldChanged(fieldName: keyof typeof defaultValues, currentValue: string | AdditionalInnerPage[]): boolean {
    if (fieldName === "additionalInnerPages") {
      const current = currentValue as AdditionalInnerPage[];
      const defaultVal = defaultValues.additionalInnerPages;
      if (current.length !== defaultVal.length) return true;
      return current.some((item, idx) => {
        const defaultItem = defaultVal[idx];
        if (!defaultItem) return true;
        return item.type !== defaultItem.type ||
               item.pages !== defaultItem.pages ||
               item.paper !== defaultItem.paper ||
               item.print !== defaultItem.print;
      });
    }
    return (currentValue as string).trim() !== defaultValues[fieldName].trim();
  }

  // 낱장 전용
  const [sheetMediaName, setSheetMediaName] = useState("낱장 인쇄물");
  const [size, setSize] = useState("");
  const [paperName, setPaperName] = useState("");
  const [paperWeight, setPaperWeight] = useState("");
  const [paperColor, setPaperColor] = useState("");
  const [printSide, setPrintSide] = useState<"단면" | "양면">("양면");
  const [printColor, setPrintColor] = useState<"먹1도" | "컬러">("컬러");
  const [finishing, setFinishing] = useState<Record<string, boolean>>({ "없음": true });
  const [finishingEtc, setFinishingEtc] = useState("");
  const [cutting, setCutting] = useState<"필요없음" | "정재단">("정재단");
  const [kindsCountStr, setKindsCountStr] = useState("1");
  const [sheetsPerKindStr, setSheetsPerKindStr] = useState("1");
  const [extraRequest, setExtraRequest] = useState("");
  const [receiveMethod, setReceiveMethod] = useState<"완료시 전화요망" | "완료시 방문수령">("완료시 전화요망");
  const [sheetSuggestions, setSheetSuggestions] = useState<{
    size: string[];
    paper_name: string[];
    paper_weight: string[];
    paper_color: string[];
  }>({ size: [], paper_name: [], paper_weight: [], paper_color: [] });
  const [activeSuggestions, setActiveSuggestions] = useState<"size" | "paper_name" | "paper_weight" | "paper_color" | null>(null);
  const sizeWrapperRef = useRef<HTMLDivElement>(null);
  const paperNameWrapperRef = useRef<HTMLDivElement>(null);
  const paperWeightWrapperRef = useRef<HTMLDivElement>(null);
  const paperColorWrapperRef = useRef<HTMLDivElement>(null);
  const bookOrdererNameInputRef = useRef<HTMLInputElement>(null);
  const requesterNameInputRef = useRef<HTMLInputElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const vendorSelectRef = useRef<HTMLSelectElement>(null);
  const mediaIdSelectRef = useRef<HTMLSelectElement>(null);
  const bookOrdererInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const sheetMediaNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 의뢰자 이름은 페이지 로드 시 빈칸으로 시작 (이전 값 자동 입력 방지)
    // setRequesterName(getStoredRequester()); // 제거: 여러 사용자가 이전 의뢰자 이름을 그대로 사용하는 오류 방지
    Promise.all([
      fetch("/api/spec")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setSpecs(data))
        .catch(() => {}),
      fetch("/api/vendors")
        .then((r) => r.json())
        .then((data: Vendor[]) => {
          // 활성화된 업체만 필터링
          const activeVendors = Array.isArray(data) 
            ? data.filter((v) => v.is_active === "TRUE" || v.is_active === "true")
            : [];
          setVendors(activeVendors);
        })
        .catch(() => {
          // vendors API가 없거나 접근 권한이 없을 수 있으므로 무시
          setVendors([]);
        })
    ]);
  }, []);

  useEffect(() => {
    if (orderType !== "sheet") return;
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data: { order_type?: string; type_spec_snapshot?: string }[]) => {
        if (!Array.isArray(data)) return;
        const sizeSet = new Set<string>();
        const paperNameSet = new Set<string>();
        const paperWeightSet = new Set<string>();
        const paperColorSet = new Set<string>();
        const MAX = 20;
        for (const job of data) {
          if (job.order_type !== "sheet" || !job.type_spec_snapshot) continue;
          try {
            const spec = JSON.parse(job.type_spec_snapshot) as Record<string, unknown>;
            if (typeof spec.size === "string" && spec.size.trim() && sizeSet.size < MAX) sizeSet.add(spec.size.trim());
            if (typeof spec.paper_name === "string" && spec.paper_name.trim() && paperNameSet.size < MAX) paperNameSet.add(spec.paper_name.trim());
            if (typeof spec.paper_weight === "string" && spec.paper_weight.trim() && paperWeightSet.size < MAX) paperWeightSet.add(spec.paper_weight.trim());
            if (typeof spec.paper_color === "string" && spec.paper_color.trim() && paperColorSet.size < MAX) paperColorSet.add(spec.paper_color.trim());
          } catch {
            // ignore parse error
          }
        }
        setSheetSuggestions({
          size: Array.from(sizeSet),
          paper_name: Array.from(paperNameSet),
          paper_weight: Array.from(paperWeightSet),
          paper_color: Array.from(paperColorSet),
        });
      })
      .catch(() => {});
  }, [orderType]);

  useEffect(() => {
    if (!activeSuggestions) return;
    const ref =
      activeSuggestions === "size"
        ? sizeWrapperRef
        : activeSuggestions === "paper_name"
          ? paperNameWrapperRef
          : activeSuggestions === "paper_weight"
            ? paperWeightWrapperRef
            : paperColorWrapperRef;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setActiveSuggestions(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [activeSuggestions]);

  useEffect(() => {
    if (!mediaId || mediaId === MEDIA_OTHER) {
      setSpec(null);
      setVendor("");
      setTrimSize("");
      setCoverType("");
      setCoverPaper("");
      setCoverPrint("");
      setInnerPages("");
      setInnerPaper("");
      setInnerPrint("");
      setBinding("");
      setFinishingSpec("");
      setPackagingDelivery("");
      setFileRule("");
      setAdditionalInnerPages([]);
      if (mediaId === MEDIA_OTHER) {
        setDefaultValues({
          trimSize: "",
          coverType: "",
          coverPaper: "",
          coverPrint: "",
          innerPages: "",
          innerPaper: "",
          innerPrint: "",
          binding: "",
          finishingSpec: "",
          packagingDelivery: "",
          fileRule: "",
          additionalInnerPages: [],
        });
      }
      return;
    }
    const s = specs.find((x) => x.media_id === mediaId) ?? null;
    setSpec(s);
    setVendor(s?.default_vendor ?? "");
    if (s) {
      setTrimSize(s.trim_size || "");
      setCoverType(s.cover_type || "");
      setCoverPaper(s.cover_paper || "");
      setCoverPrint(s.cover_print || s.print_color || "");
      setInnerPages(s.inner_pages || s.pages || "");
      setInnerPaper(s.inner_paper || "");
      setInnerPrint(s.inner_print || s.print_color || "");
      setBinding(s.binding || "");
      setFinishingSpec(s.finishing || "");
      setPackagingDelivery(s.packaging_delivery || "");
      setFileRule(s.file_rule || "");
      // 기본 추가 내지 불러오기
      let defaultAdditionalPages: AdditionalInnerPage[] = [];
      try {
        if (s.additional_inner_pages) {
          const parsed = JSON.parse(s.additional_inner_pages);
          if (Array.isArray(parsed)) {
            defaultAdditionalPages = parsed;
            setAdditionalInnerPages(parsed);
          } else {
            setAdditionalInnerPages([]);
          }
        } else {
          setAdditionalInnerPages([]);
        }
      } catch {
        setAdditionalInnerPages([]);
      }
      // 기본값 저장 (변경 감지용)
      setDefaultValues({
        trimSize: s.trim_size || "",
        coverType: s.cover_type || "",
        coverPaper: s.cover_paper || "",
        coverPrint: s.cover_print || s.print_color || "",
        innerPages: s.inner_pages || s.pages || "",
        innerPaper: s.inner_paper || "",
        innerPrint: s.inner_print || s.print_color || "",
        binding: s.binding || "",
        finishingSpec: s.finishing || "",
        packagingDelivery: s.packaging_delivery || "",
        fileRule: s.file_rule || "",
        additionalInnerPages: defaultAdditionalPages,
      });
    } else {
      // 매체가 선택되지 않았을 때 기본값 초기화
      setDefaultValues({
        trimSize: "",
        coverType: "",
        coverPaper: "",
        coverPrint: "",
        innerPages: "",
        innerPaper: "",
        innerPrint: "",
        binding: "",
        finishingSpec: "",
        packagingDelivery: "",
        fileRule: "",
        additionalInnerPages: [],
      });
    }
  }, [mediaId, specs]);

  useEffect(() => {
    if (mediaId === MEDIA_OTHER && orderType === "book") {
      bookOrdererNameInputRef.current?.focus();
    }
  }, [mediaId, orderType]);

  // 추가 내지 관리 함수
  function addAdditionalInnerPage() {
    setAdditionalInnerPages([...additionalInnerPages, { type: "", pages: "", paper: "", print: "" }]);
  }

  function removeAdditionalInnerPage(index: number) {
    setAdditionalInnerPages(additionalInnerPages.filter((_, i) => i !== index));
  }

  function updateAdditionalInnerPage(index: number, field: keyof AdditionalInnerPage, value: string) {
    const updated = [...additionalInnerPages];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalInnerPages(updated);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function setFinishingOption(key: string, checked: boolean) {
    setFinishing((prev) => {
      if (key === "없음") {
        if (checked) return { "없음": true };
        return { ...prev, "없음": false };
      }
      if (checked) return { ...prev, [key]: true, "없음": false };
      return { ...prev, [key]: false };
    });
  }

  function filterSuggestions(list: string[], value: string): string[] {
    if (!value.trim()) return list.slice(0, 10);
    const v = value.trim().toLowerCase();
    return list.filter((s) => s.toLowerCase().includes(v)).slice(0, 10);
  }

  function SuggestionDropdown({
    field,
    value,
    onSelect,
  }: {
    field: "size" | "paper_name" | "paper_weight" | "paper_color";
    value: string;
    onSelect: (s: string) => void;
  }) {
    const list = sheetSuggestions[field];
    const filtered = filterSuggestions(list, value);
    const open = activeSuggestions === field && filtered.length > 0;
    if (!open) return null;
    return (
      <ul
        className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        onPointerDown={(e) => e.preventDefault()}
      >
        {filtered.map((s) => (
          <li
            key={s}
            role="button"
            tabIndex={-1}
            className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 active:bg-slate-200"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(s);
              setActiveSuggestions(null);
            }}
          >
            {s}
          </li>
        ))}
      </ul>
    );
  }

  type FocusableFieldKey =
    | "requesterName"
    | "dueDate"
    | "vendor"
    | "mediaId"
    | "bookOrdererName"
    | "bookOtherMediaName"
    | "qty"
    | "sheetMediaName"
    | "size"
    | "paperName"
    | "paperWeight"
    | "paperColor";

  function getMissingRequiredFields(): { keys: FocusableFieldKey[]; labels: string[] } {
    const keys: FocusableFieldKey[] = [];
    const labels: string[] = [];
    if (!requesterName.trim()) {
      keys.push("requesterName");
      labels.push("의뢰자 이름");
    }
    if (!dueDate) {
      keys.push("dueDate");
      labels.push("납기일");
    }
    if (!vendor.trim()) {
      keys.push("vendor");
      labels.push("제작업체");
    }
    if (orderType === "book") {
      if (!mediaId) {
        keys.push("mediaId");
        labels.push("매체명");
      }
      if (mediaId === MEDIA_OTHER) {
        if (!bookOrdererName.trim()) {
          keys.push("bookOrdererName");
          labels.push("발주사 (매체ID)");
        }
        if (!bookOtherMediaName.trim()) {
          keys.push("bookOtherMediaName");
          labels.push("매체명");
        }
      }
      if (!qty.trim()) {
        keys.push("qty");
        labels.push("수량");
      }
    } else {
      if (!sheetMediaName.trim()) {
        keys.push("sheetMediaName");
        labels.push("매체명");
      }
      if (!size.trim()) {
        keys.push("size");
        labels.push("낱장 사양 1. 사이즈");
      }
      if (!paperName.trim()) {
        keys.push("paperName");
        labels.push("낱장 사양 2. 용지명");
      }
      if (!paperWeight.trim()) {
        keys.push("paperWeight");
        labels.push("낱장 사양 2. 평량");
      }
      if (!paperColor.trim()) {
        keys.push("paperColor");
        labels.push("낱장 사양 2. 용지색상");
      }
    }
    return { keys, labels };
  }

  function focusField(key: FocusableFieldKey) {
    const el =
      key === "requesterName"
        ? requesterNameInputRef.current
        : key === "dueDate"
          ? dueDateInputRef.current
          : key === "vendor"
            ? vendorSelectRef.current
            : key === "mediaId"
              ? mediaIdSelectRef.current
              : key === "bookOrdererName"
                ? bookOrdererInputRef.current
                : key === "bookOtherMediaName"
                  ? bookOrdererNameInputRef.current
                  : key === "qty"
                    ? qtyInputRef.current
                    : key === "sheetMediaName"
                      ? sheetMediaNameInputRef.current
                      : key === "size"
                        ? (sizeWrapperRef.current?.querySelector("input") as HTMLInputElement | null)
                        : key === "paperName"
                          ? (paperNameWrapperRef.current?.querySelector("input") as HTMLInputElement | null)
                          : key === "paperWeight"
                            ? (paperWeightWrapperRef.current?.querySelector("input") as HTMLInputElement | null)
                            : key === "paperColor"
                              ? (paperColorWrapperRef.current?.querySelector("input") as HTMLInputElement | null)
                              : null;
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { keys, labels } = getMissingRequiredFields();
    if (keys.length > 0) {
      const message = "입력 내용을 확인해 주세요.\n\n필수 항목: " + labels.join(", ");
      window.alert(message);
      setToast("err");
      setTimeout(() => setToast(null), 2000);
      setTimeout(() => focusField(keys[0]), 0);
      return;
    }
    openPreviewWindow();
  }

  function esc(s: string): string {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 제작금액 계산 함수 (재사용)
  function calculateProductionCost() {
    // 페이지 수 추출 함수
    function extractPageCount(pageStr: string): number {
      if (!pageStr) return 0;
      const match = pageStr.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }

    if (orderType === "book") {
      if (!spec && mediaId !== MEDIA_OTHER) return null;

      // 수량 추출 (기본값 1)
      const qtyNum = parseInt(qty.trim(), 10) || 1;

      // 표지 페이지 수 계산 (단면: 2페이지, 양면: 4페이지)
      const coverPageCount = coverPrint.includes("단면") ? 2 : 4;
      const coverCost = coverPageCount * 300 * qtyNum;

      // 내지 페이지 수 계산
      const innerPageCount = extractPageCount(innerPages);
      const innerCost = innerPageCount * 300 * qtyNum;

      // 추가 내지 비용 계산
      let additionalInnerCost = 0;
      additionalInnerPages.forEach((item) => {
        const pageCount = extractPageCount(item.pages);
        additionalInnerCost += pageCount * 300 * qtyNum;
      });

      // 제본 비용 (권당)
      let bindingCost = 0;
      if (binding.includes("무선제본")) {
        bindingCost = 2000 * qtyNum;
      } else if (binding.includes("중철제본")) {
        bindingCost = 1500 * qtyNum;
      }

      // 후가공 비용
      let finishingCost = 0;
      const finishingLower = finishingSpec.toLowerCase().trim();
      
      if (finishingLower.startsWith("없음") || finishingLower === "") {
        finishingCost = 0;
      } else if (finishingLower.includes("에폭시")) {
        finishingCost = 120000;
      } else if (
        finishingLower.includes("코팅") ||
        finishingLower.includes("라미네이팅") ||
        finishingLower.includes("라미테이팅")
      ) {
        let coatingPageCount = 2;
        if (finishingLower.includes("양면")) {
          coatingPageCount = 4;
        }
        finishingCost = coatingPageCount * 500 * qtyNum;
      }

      // 총 제작금액 (공급가)
      const subtotal = coverCost + innerCost + additionalInnerCost + bindingCost + finishingCost;
      
      // 부가세 (10%)
      const vat = Math.floor(subtotal * 0.1);
      
      // 총금액
      const total = subtotal + vat;

      return {
        coverCost,
        innerCost,
        additionalInnerCost,
        bindingCost,
        finishingCost,
        subtotal,
        vat,
        total,
        qtyNum,
        coverPageCount,
        innerPageCount,
        additionalInnerPagesTotal: additionalInnerPages.reduce((sum, item) => sum + extractPageCount(item.pages), 0),
      };
    } else if (orderType === "sheet") {
      // 낱장 금액 계산
      const kindsCount = Math.max(1, parseInt(kindsCountStr, 10) || 1);
      const sheetsPerKind = Math.max(1, parseInt(sheetsPerKindStr, 10) || 1);
      const totalSheets = kindsCount * sheetsPerKind;

      // 기본 인쇄 비용 (매당 300원)
      const printCost = totalSheets * 300;

      // 인쇄 컬러 비용 (컬러인 경우 추가 비용 없음, 기본 가격에 포함)
      // 먹1도와 컬러의 차이는 별도 계산하지 않음 (기본 가격에 포함)

      // 후가공 비용
      let finishingCost = 0;
      const finishingList = getFinishingList();
      const finishingLower = finishingList.toLowerCase().trim();

      if (finishingLower.startsWith("없음") || finishingLower === "") {
        finishingCost = 0;
      } else if (finishingLower.includes("에폭시")) {
        // 에폭시는 종 수당 1회 (120000원)
        finishingCost = 120000 * kindsCount;
      } else if (
        finishingLower.includes("코팅") ||
        finishingLower.includes("라미네이팅") ||
        finishingLower.includes("라미테이팅")
      ) {
        // 코팅은 매당 500원
        let coatingSheets = totalSheets;
        if (printSide === "양면") {
          // 양면 인쇄인 경우 양면 코팅으로 계산 (매당 2면)
          coatingSheets = totalSheets * 2;
        }
        finishingCost = coatingSheets * 500;
      }

      // 재단 비용 (정재단인 경우 추가 비용 없음, 필요없음인 경우도 추가 비용 없음)
      const cuttingCost = 0;

      // 총 제작금액 (공급가)
      const subtotal = printCost + finishingCost + cuttingCost;
      
      // 부가세 (10%)
      const vat = Math.floor(subtotal * 0.1);
      
      // 총금액
      const total = subtotal + vat;

      return {
        printCost,
        finishingCost,
        cuttingCost,
        subtotal,
        vat,
        total,
        qtyNum: totalSheets,
        kindsCount,
        sheetsPerKind,
      };
    }

    return null;
  }

  function getFinishingList(): string {
    if (orderType !== "sheet") return "";
    const hasOther = SHEET_FINISHING_OPTIONS.some((k) => finishing[k]) || (finishing["기타"] && finishingEtc.trim());
    if (finishing["없음"] || !hasOther) return "없음";
    const list: string[] = [...SHEET_FINISHING_OPTIONS.filter((k) => finishing[k])];
    if (finishing["기타"] && finishingEtc.trim()) list.push(`기타: ${finishingEtc.trim()}`);
    return list.join(", ");
  }

  function openPreviewWindow() {
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.focus();
      return;
    }
    (window as unknown as { __printOrderConfirm?: () => void }).__printOrderConfirm = () => {
      previewWindowRef.current?.close();
      previewWindowRef.current = null;
      doSubmit();
    };
    const orderTypeLabel = orderType === "book" ? "책자" : "낱장 인쇄물";
    const mediaDisplay = orderType === "book"
      ? (mediaId === MEDIA_OTHER ? (bookOtherMediaName.trim() || "-") : (spec?.media_name ?? mediaId) || "-")
      : (sheetMediaName.trim() || "낱장 인쇄물");
    const qtyDisplay = orderType === "book" ? (qty.trim() || "-") : `${kindsCountStr}종 ${sheetsPerKindStr}매`;
    const sheetBlock =
      orderType === "sheet"
        ? `
    <div class="block">
      <h3 class="sec">낱장 인쇄 사양</h3>
      <dl class="grid">
        <div><dt>사이즈</dt><dd>${esc(size.trim() || "-")}</dd></div>
        <div><dt>용지명</dt><dd>${esc(paperName.trim() || "-")}</dd></div>
        <div><dt>평량</dt><dd>${esc(paperWeight.trim() || "-")}</dd></div>
        <div><dt>용지색상</dt><dd>${esc(paperColor.trim() || "-")}</dd></div>
        <div><dt>인쇄 (단/양면)</dt><dd>${esc(printSide)}</dd></div>
        <div><dt>인쇄 (도수)</dt><dd>${esc(printColor)}</dd></div>
        <div><dt>후가공</dt><dd>${esc(finishingLabel)}</dd></div>
        <div><dt>재단</dt><dd>${esc(cutting)}</dd></div>
        <div><dt>종 수</dt><dd>${esc(kindsCountStr)}</dd></div>
        <div><dt>수량 (매)</dt><dd>${esc(sheetsPerKindStr)}</dd></div>
        <div class="full"><dt>추가 요청사항</dt><dd>${esc(extraRequest.trim() || "없음")}</dd></div>
        <div><dt>수령방법</dt><dd>${esc(receiveMethod)}</dd></div>
      </dl>
    </div>`
        : "";
    const additionalInnerPagesBlock =
      orderType === "book" && additionalInnerPages.length > 0
        ? `
    <div class="block spec">
      <h3 class="sec">추가 내지</h3>
      ${additionalInnerPages
        .map(
          (item, idx) => `
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
        <h4 style="font-size: 0.875rem; color: #475569; margin: 0 0 8px; font-weight: 500;">추가 내지 ${idx + 1}</h4>
        <dl class="grid">
          <div><dt>유형</dt><dd>${esc(item.type.trim() || "-")}</dd></div>
          <div><dt>페이지</dt><dd>${esc(item.pages.trim() || "-")}</dd></div>
          <div><dt>용지</dt><dd>${esc(item.paper.trim() || "-")}</dd></div>
          <div><dt>인쇄</dt><dd>${esc(item.print.trim() || "-")}</dd></div>
        </dl>
      </div>`
        )
        .join("")}
    </div>`
        : "";

    const bookSpecBlock =
      orderType === "book" && (spec || mediaId === MEDIA_OTHER)
        ? `
    <div class="block spec">
      <h3 class="sec">제작 사양 (매체)</h3>
      <dl class="grid">
        <div><dt>판형</dt><dd>${esc(trimSize.trim() || "-")}</dd></div>
        <div><dt>표지유형</dt><dd>${esc(coverType.trim() || "-")}</dd></div>
        <div><dt>표지용지</dt><dd>${esc(coverPaper.trim() || "-")}</dd></div>
        <div><dt>표지인쇄</dt><dd>${esc(coverPrint.trim() || "-")}</dd></div>
        <div><dt>내지페이지</dt><dd>${esc(innerPages.trim() || "-")}</dd></div>
        <div><dt>내지용지</dt><dd>${esc(innerPaper.trim() || "-")}</dd></div>
        <div><dt>내지인쇄</dt><dd>${esc(innerPrint.trim() || "-")}</dd></div>
        <div><dt>제본</dt><dd>${esc(binding.trim() || "-")}</dd></div>
        <div><dt>후가공</dt><dd>${esc(finishingSpec.trim() || "-")}</dd></div>
        <div><dt>포장·납품</dt><dd>${esc(packagingDelivery.trim() || "-")}</dd></div>
        <div class="full"><dt>파일규격</dt><dd>${esc(fileRule.trim() || "-")}</dd></div>
      </dl>
    </div>
    ${additionalInnerPagesBlock}`
        : "";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>의뢰 내용 미리보기</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #f1f5f9; color: #1e293b; -webkit-text-size-adjust: 100%; }
    .wrap { max-width: 560px; margin: 0 auto; }
    h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 16px; color: #0f172a; }
    .badge { display: inline-block; background: #e2e8f0; color: #475569; font-size: 0.875rem; padding: 8px 14px; border-radius: 8px; margin-bottom: 16px; }
    .block { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .block.spec { background: #f8fafc; }
    .sec { font-size: 1rem; color: #64748b; margin: 0 0 12px; font-weight: 500; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; font-size: 0.9375rem; }
    .grid .full { grid-column: 1 / -1; }
    .grid dt { color: #94a3b8; margin: 0; font-weight: 500; }
    .grid dd { margin: 0; color: #1e293b; word-break: break-all; white-space: pre-wrap; }
    .actions { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
    .btn { padding: 14px 28px; font-size: 1rem; border-radius: 8px; cursor: pointer; border: none; font-weight: 500; min-height: 44px; flex: 1; min-width: 120px; }
    .btn-primary { background: #1e293b; color: #fff; }
    .btn-primary:hover { background: #334155; }
    .btn-primary:active { background: #475569; }
    .btn-secondary { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #f1f5f9; }
    .btn-secondary:active { background: #e2e8f0; }
    
    @media (max-width: 640px) {
      body { padding: 12px; }
      h1 { font-size: 1.25rem; }
      .badge { font-size: 0.8125rem; padding: 6px 12px; }
      .block { padding: 14px; }
      .sec { font-size: 0.9375rem; }
      .grid { grid-template-columns: 1fr; gap: 10px; font-size: 0.9375rem; }
      .grid dt { font-size: 0.875rem; margin-bottom: 4px; }
      .grid dd { font-size: 0.9375rem; }
      .actions { flex-direction: column; gap: 10px; }
      .btn { width: 100%; font-size: 1rem; padding: 14px 24px; }
    }
    
    @media (max-width: 480px) {
      body { padding: 10px; }
      h1 { font-size: 1.125rem; margin-bottom: 12px; }
      .block { padding: 12px; margin-bottom: 12px; }
      .sec { font-size: 0.875rem; margin-bottom: 10px; }
      .grid { font-size: 0.875rem; gap: 8px; }
      .grid dt { font-size: 0.8125rem; }
      .grid dd { font-size: 0.875rem; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge">미리보기 창</div>
    <h1>의뢰 내용 미리보기</h1>
    <p style="font-size:0.875rem;color:#64748b;margin:0 0 16px;">아래 내용을 확인한 뒤 확인 시 제출됩니다.</p>
    <div class="block">
      <h3 class="sec">입력 내용</h3>
      <dl class="grid">
        <div><dt>제작 유형</dt><dd>${esc(orderTypeLabel)}</dd></div>
        <div><dt>의뢰자</dt><dd>${esc(requesterName.trim() || "-")}</dd></div>
        ${orderType === "book" ? `<div><dt>발주사 (매체ID)</dt><dd>${esc(mediaId === MEDIA_OTHER ? (bookOrdererName.trim() || "-") : (spec?.media_id || "-"))}</dd></div><div><dt>매체명</dt><dd>${esc(mediaDisplay)}</dd></div>` : `<div><dt>매체명</dt><dd>${esc(mediaDisplay)}</dd></div>`}
        <div><dt>제작업체</dt><dd>${esc(vendor.trim() || "-")}</dd></div>
        <div><dt>납기일</dt><dd>${esc(dueDate || "-")}</dd></div>
        <div><dt>수량</dt><dd>${esc(qtyDisplay)}</dd></div>
        <div class="full"><dt>파일 링크</dt><dd>${esc(fileLink.trim() || "-")}</dd></div>
        <div class="full"><dt>변경 및 요청 사항</dt><dd>${esc(changesNote.trim() || "없음")}</dd></div>
      </dl>
    </div>
    ${sheetBlock}
    ${bookSpecBlock}
    ${(() => {
      const cost = calculateProductionCost();
      if (!cost) return "";

      return `
    <div class="block" style="background: #fff; border: 2px solid #e2e8f0;">
      <h3 class="sec">제작금액</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div style="display: flex; flex-direction: column; gap: 12px; padding-right: 16px; border-right: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9375rem; color: #64748b;">공급가</span>
            <span style="font-size: 0.9375rem; font-weight: 500; color: #1e293b;">${cost.subtotal.toLocaleString()}원</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9375rem; color: #64748b;">부가세 (10%)</span>
            <span style="font-size: 0.9375rem; font-weight: 500; color: #1e293b;">${cost.vat.toLocaleString()}원</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 16px;">
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px;">총 결제금액</div>
          <div style="font-size: 2rem; font-weight: 700; color: #dc2626;">${cost.total.toLocaleString()}원</div>
        </div>
      </div>
    </div>`;
    })()}
    <div class="actions">
      <button type="button" class="btn btn-primary" id="btn-confirm">확인 (제출)</button>
      <button type="button" class="btn btn-secondary" id="btn-cancel">취소</button>
    </div>
  </div>
  <script>
    document.getElementById("btn-confirm").onclick = function() {
      if (window.opener && typeof window.opener.__printOrderConfirm === "function") {
        window.opener.__printOrderConfirm();
      }
      window.close();
    };
    document.getElementById("btn-cancel").onclick = function() { window.close(); };
  </script>
</body>
</html>`;
    // 모바일 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // 모바일에서는 전체 화면으로, 데스크탑에서는 고정 크기로
    const windowFeatures = isMobile
      ? "width=device-width,height=device-height,scrollbars=yes,resizable=yes"
      : "width=620,height=700,scrollbars=yes,resizable=yes";
    
    const win = window.open("", "_blank", windowFeatures);
    if (win) {
      win.document.write(html);
      win.document.close();
      previewWindowRef.current = win;
      // 모바일에서 창을 포커스
      if (isMobile) {
        win.focus();
      }
    } else {
      window.alert("팝업이 차단되었을 수 있습니다. 브라우저에서 팝업을 허용해 주세요.");
    }
  }

  async function doSubmit() {
    setSubmitting(true);
    setToast(null);
    setStoredRequester(requesterName.trim());
    try {
      const payload: Record<string, unknown> = {
        order_type: orderType,
        requester_name: requesterName.trim(),
        due_date: dueDate,
        vendor: vendor.trim() || undefined,
        file_link: fileLink.trim() || undefined,
        changes_note: changesNote.trim() || "없음",
      };
      if (orderType === "book") {
        payload.media_id = mediaId;
        payload.media_name = mediaId === MEDIA_OTHER ? bookOtherMediaName.trim() : undefined;
        payload.qty = qty.trim();
        const specSnapshot: Record<string, unknown> = {
          media_id: mediaId === MEDIA_OTHER ? bookOrdererName.trim() : mediaId,
          media_name: mediaId === MEDIA_OTHER ? bookOtherMediaName.trim() : (spec?.media_name || ""),
          default_vendor: spec?.default_vendor || "",
          trim_size: trimSize.trim(),
          cover_type: coverType.trim(),
          cover_paper: coverPaper.trim(),
          cover_print: coverPrint.trim(),
          inner_pages: innerPages.trim(),
          inner_paper: innerPaper.trim(),
          inner_print: innerPrint.trim(),
          binding: binding.trim(),
          finishing: finishingSpec.trim(),
          packaging_delivery: packagingDelivery.trim(),
          file_rule: fileRule.trim(),
        };
        // 추가 내지가 있으면 배열로 추가
        if (additionalInnerPages.length > 0) {
          specSnapshot.additional_inner_pages = additionalInnerPages.map((item) => ({
            type: item.type.trim(),
            pages: item.pages.trim(),
            paper: item.paper.trim(),
            print: item.print.trim(),
          }));
        }
        payload.spec_snapshot = JSON.stringify(specSnapshot);
      } else {
        const kindsCount = Math.max(1, parseInt(kindsCountStr, 10) || 1);
        const sheetsPerKind = Math.max(1, parseInt(sheetsPerKindStr, 10) || 1);
        payload.media_name = sheetMediaName.trim() || "낱장 인쇄물";
        payload.qty = `${kindsCount}종 ${sheetsPerKind}매`;
        const hasOther = SHEET_FINISHING_OPTIONS.some((k) => finishing[k]) || (finishing["기타"] && finishingEtc.trim());
        const selectedFinishing: string[] = finishing["없음"] || !hasOther
          ? ["없음"]
          : [
              ...SHEET_FINISHING_OPTIONS.filter((k) => finishing[k]),
              ...(finishing["기타"] && finishingEtc.trim() ? [`기타: ${finishingEtc.trim()}`] : []),
            ];
        payload.type_spec = {
          size: size.trim(),
          paper_name: paperName.trim(),
          paper_weight: paperWeight.trim(),
          paper_color: paperColor.trim(),
          print_side: printSide,
          print_color: printColor,
          finishing: selectedFinishing,
          cutting,
          kinds_count: kindsCount,
          sheets_per_kind: sheetsPerKind,
          extra_request: extraRequest.trim() || "없음",
          receive_method: receiveMethod,
        };
      }
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = data.error || "의뢰 생성에 실패했습니다.";
        console.error("API error:", errorMsg);
        setToast("err");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      if (!data.job_id) {
        console.error("job_id not found in response:", data);
        setToast("err");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      setToast("ok");
      window.alert("의뢰서가 정상적으로 제출되었습니다.");
      const jobId = data.job_id;
      const maxAttempts = 24;
      const intervalMs = 500;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (r.ok) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          router.push(`/jobs/${jobId}`);
          router.refresh();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      router.push("/list");
      router.refresh();
    } catch {
      setToast("err");
    } finally {
      setSubmitting(false);
    }
  }

  const finishingLabel = (() => {
    const hasOther = SHEET_FINISHING_OPTIONS.some((k) => finishing[k]) || (finishing["기타"] && finishingEtc.trim());
    if (finishing["없음"] || !hasOther) return "없음";
    const list: string[] = [...SHEET_FINISHING_OPTIONS.filter((k) => finishing[k])];
    if (finishing["기타"] && finishingEtc.trim()) list.push(`기타: ${finishingEtc.trim()}`);
    return list.join(", ");
  })();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/list" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            홈으로
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-600">잠금해제됨 ✔</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              잠금(로그아웃)
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-800 mb-6">새 의뢰 등록</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 mb-3">제작 유형</h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === "book"}
                  onChange={() => setOrderType("book")}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">책자</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === "sheet"}
                  onChange={() => setOrderType("sheet")}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">낱장 인쇄물</span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-slate-500">공통 입력</h2>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">의뢰자 이름</span>
              <input
                ref={requesterNameInputRef}
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
            {orderType === "book" ? (
              <>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">매체명</span>
                  <select
                    ref={mediaIdSelectRef}
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">선택</option>
                    {specs.map((s) => (
                      <option key={s.media_id} value={s.media_id}>{s.media_name}</option>
                    ))}
                    <option value={MEDIA_OTHER}>기타</option>
                  </select>
                  <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out"
                    style={{ gridTemplateRows: mediaId === MEDIA_OTHER ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <input
                        ref={bookOrdererNameInputRef}
                        type="text"
                        value={bookOtherMediaName}
                        onChange={(e) => setBookOtherMediaName(e.target.value)}
                        placeholder="매체명을 입력하세요"
                        className="input-dark mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  {specs.length === 0 && mediaId !== MEDIA_OTHER && (
                    <p className="mt-1 text-xs text-amber-600">
                      등록된 매체가 없습니다.{" "}
                      <Link href="/specs" className="underline">매체 사양 관리</Link>에서 먼저 매체를 추가해 주세요.
                    </p>
                  )}
                </label>
                {mediaId && (
                  <label className="block">
                    <span className="block text-sm text-slate-600 mb-1">발주사 (매체ID)</span>
                    {mediaId === MEDIA_OTHER ? (
                      <input
                        ref={bookOrdererInputRef}
                        type="text"
                        value={bookOrdererName}
                        onChange={(e) => setBookOrdererName(e.target.value)}
                        placeholder="발주사를 입력하세요"
                        className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-500"
                      />
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        {spec?.media_id || "-"}
                      </div>
                    )}
                  </label>
                )}
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">수량</span>
                  <input
                    ref={qtyInputRef}
                    type="text"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">매체명</span>
                <input
                  ref={sheetMediaNameInputRef}
                  type="text"
                  value={sheetMediaName}
                  onChange={(e) => setSheetMediaName(e.target.value)}
                  placeholder="낱장 인쇄물"
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">제작업체</span>
              <select
                ref={vendorSelectRef}
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">선택하세요</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_name}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">납기일</span>
              <input
                ref={dueDateInputRef}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">파일 링크</span>
              <input
                type="url"
                value={fileLink}
                onChange={(e) => setFileLink(e.target.value)}
                placeholder="https://..."
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">변경 및 요청 사항</span>
              <textarea
                value={changesNote}
                onChange={(e) => setChangesNote(e.target.value)}
                rows={2}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>

          {orderType === "sheet" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-medium text-slate-500">낱장 인쇄 사양</h2>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">1. 사이즈</span>
                <div ref={sizeWrapperRef} className="relative">
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    onFocus={() => setActiveSuggestions("size")}
                    placeholder="예: 210×297"
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <SuggestionDropdown field="size" value={size} onSelect={setSize} />
                </div>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">2. 용지명</span>
                  <div ref={paperNameWrapperRef} className="relative">
                    <input
                      type="text"
                      value={paperName}
                      onChange={(e) => setPaperName(e.target.value)}
                      onFocus={() => setActiveSuggestions("paper_name")}
                      className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <SuggestionDropdown field="paper_name" value={paperName} onSelect={setPaperName} />
                  </div>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">평량</span>
                  <div ref={paperWeightWrapperRef} className="relative">
                    <input
                      type="text"
                      value={paperWeight}
                      onChange={(e) => setPaperWeight(e.target.value)}
                      onFocus={() => setActiveSuggestions("paper_weight")}
                      placeholder="예: 80g"
                      className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <SuggestionDropdown field="paper_weight" value={paperWeight} onSelect={setPaperWeight} />
                  </div>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">용지색상</span>
                  <div ref={paperColorWrapperRef} className="relative">
                    <input
                      type="text"
                      value={paperColor}
                      onChange={(e) => setPaperColor(e.target.value)}
                      onFocus={() => setActiveSuggestions("paper_color")}
                      placeholder="예: 백상지"
                      className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <SuggestionDropdown field="paper_color" value={paperColor} onSelect={setPaperColor} />
                  </div>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">3. 인쇄 (단면/양면)</span>
                  <select
                    value={printSide}
                    onChange={(e) => setPrintSide(e.target.value as "단면" | "양면")}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="단면">단면</option>
                    <option value="양면">양면</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">인쇄 (먹1도/컬러)</span>
                  <select
                    value={printColor}
                    onChange={(e) => setPrintColor(e.target.value as "먹1도" | "컬러")}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="먹1도">먹1도</option>
                    <option value="컬러">컬러</option>
                  </select>
                </label>
              </div>
              <div className="block">
                <span className="block text-sm text-slate-600 mb-2">4. 후가공</span>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!finishing["없음"]}
                      onChange={(e) => setFinishingOption("없음", e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">없음</span>
                  </label>
                  {SHEET_FINISHING_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!finishing[opt]}
                        onChange={(e) => setFinishingOption(opt, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!finishing["기타"]}
                      onChange={(e) => setFinishingOption("기타", e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">기타</span>
                    {finishing["기타"] && (
                      <input
                        type="text"
                        value={finishingEtc}
                        onChange={(e) => setFinishingEtc(e.target.value)}
                        placeholder="직접 입력"
                        className="input-dark rounded border border-slate-300 px-2 py-1 text-sm w-32"
                      />
                    )}
                  </label>
                </div>
              </div>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">5. 재단</span>
                <select
                  value={cutting}
                  onChange={(e) => setCutting(e.target.value as "필요없음" | "정재단")}
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="필요없음">필요없음</option>
                  <option value="정재단">정재단</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">6. 종 수</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={kindsCountStr}
                    onChange={(e) => setKindsCountStr(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">수량 (매)</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={sheetsPerKindStr}
                    onChange={(e) => setSheetsPerKindStr(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">7. 추가 요청사항</span>
                <textarea
                  value={extraRequest}
                  onChange={(e) => setExtraRequest(e.target.value)}
                  rows={2}
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">8. 수령방법</span>
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value as "완료시 전화요망" | "완료시 방문수령")}
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="완료시 전화요망">완료시 전화요망</option>
                  <option value="완료시 방문수령">완료시 방문수령</option>
                </select>
              </label>
            </section>
          )}

          {orderType === "book" && (spec || mediaId === MEDIA_OTHER) && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-medium text-slate-500">
                제작 사양
                {mediaId === MEDIA_OTHER && (
                  <span className="ml-2 text-xs font-normal text-amber-600">(기타 - 직접 입력)</span>
                )}
              </h2>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">판형</span>
                  <input
                    type="text"
                    value={trimSize}
                    onChange={(e) => setTrimSize(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("trimSize", trimSize)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">표지유형</span>
                  <input
                    type="text"
                    value={coverType}
                    onChange={(e) => setCoverType(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("coverType", coverType)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">표지용지</span>
                  <input
                    type="text"
                    value={coverPaper}
                    onChange={(e) => setCoverPaper(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("coverPaper", coverPaper)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">표지인쇄</span>
                  <input
                    type="text"
                    value={coverPrint}
                    onChange={(e) => setCoverPrint(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("coverPrint", coverPrint)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">내지페이지</span>
                  <input
                    type="text"
                    value={innerPages}
                    onChange={(e) => setInnerPages(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("innerPages", innerPages)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">내지용지</span>
                  <input
                    type="text"
                    value={innerPaper}
                    onChange={(e) => setInnerPaper(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("innerPaper", innerPaper)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">내지인쇄</span>
                  <input
                    type="text"
                    value={innerPrint}
                    onChange={(e) => setInnerPrint(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("innerPrint", innerPrint)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
              </div>

              {/* 추가 내지 섹션 */}
              <div className={`mt-4 pt-4 border-t ${isFieldChanged("additionalInnerPages", additionalInnerPages) ? "border-amber-300" : "border-slate-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium ${isFieldChanged("additionalInnerPages", additionalInnerPages) ? "text-amber-700" : "text-slate-600"}`}>
                    추가 내지
                    {isFieldChanged("additionalInnerPages", additionalInnerPages) && (
                      <span className="ml-2 text-xs text-amber-600">(변경됨)</span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={addAdditionalInnerPage}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <span>+</span>
                    <span>내지 추가</span>
                  </button>
                </div>

                {additionalInnerPages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">추가 내지가 없습니다. 위 버튼을 클릭하여 추가하세요.</p>
                ) : (
                  <div className="space-y-4">
                    {additionalInnerPages.map((item, index) => {
                      const defaultItem = defaultValues.additionalInnerPages[index];
                      const isItemChanged = !defaultItem || 
                        item.type !== defaultItem.type ||
                        item.pages !== defaultItem.pages ||
                        item.paper !== defaultItem.paper ||
                        item.print !== defaultItem.print;
                      const isNewItem = index >= defaultValues.additionalInnerPages.length;
                      
                      return (
                        <div
                          key={index}
                          className={`rounded-lg border p-4 ${
                            isItemChanged || isNewItem
                              ? "border-amber-400 bg-amber-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs font-medium ${isItemChanged || isNewItem ? "text-amber-700" : "text-slate-500"}`}>
                              추가 내지 {index + 1}
                              {(isItemChanged || isNewItem) && (
                                <span className="ml-2 text-xs text-amber-600">(변경됨)</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAdditionalInnerPage(index)}
                              className="text-xs text-red-600 hover:text-red-700 hover:underline"
                            >
                              삭제
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                            <label className="block">
                              <span className="block text-xs text-slate-500 mb-1">내지추가유형</span>
                              <input
                                type="text"
                                value={item.type}
                                onChange={(e) => updateAdditionalInnerPage(index, "type", e.target.value)}
                                placeholder="면지, 엽서, 별지 등"
                                className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                                  isItemChanged || isNewItem
                                    ? "border-amber-400 bg-white"
                                    : "border-slate-300"
                                }`}
                              />
                            </label>
                            <label className="block">
                              <span className="block text-xs text-slate-500 mb-1">내지추가페이지</span>
                              <input
                                type="text"
                                value={item.pages}
                                onChange={(e) => updateAdditionalInnerPage(index, "pages", e.target.value)}
                                placeholder="페이지 수"
                                className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                                  isItemChanged || isNewItem
                                    ? "border-amber-400 bg-white"
                                    : "border-slate-300"
                                }`}
                              />
                            </label>
                            <label className="block">
                              <span className="block text-xs text-slate-500 mb-1">내지추가용지</span>
                              <input
                                type="text"
                                value={item.paper}
                                onChange={(e) => updateAdditionalInnerPage(index, "paper", e.target.value)}
                                placeholder="용지 정보"
                                className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                                  isItemChanged || isNewItem
                                    ? "border-amber-400 bg-white"
                                    : "border-slate-300"
                                }`}
                              />
                            </label>
                            <label className="block">
                              <span className="block text-xs text-slate-500 mb-1">내지추가인쇄</span>
                              <input
                                type="text"
                                value={item.print}
                                onChange={(e) => updateAdditionalInnerPage(index, "print", e.target.value)}
                                placeholder="인쇄 방법"
                                className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                                  isItemChanged || isNewItem
                                    ? "border-amber-400 bg-white"
                                    : "border-slate-300"
                                }`}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 mt-4">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">제본</span>
                  <input
                    type="text"
                    value={binding}
                    onChange={(e) => setBinding(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("binding", binding)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">후가공</span>
                  <input
                    type="text"
                    value={finishingSpec}
                    onChange={(e) => setFinishingSpec(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("finishingSpec", finishingSpec)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">포장·납품</span>
                  <input
                    type="text"
                    value={packagingDelivery}
                    onChange={(e) => setPackagingDelivery(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("packagingDelivery", packagingDelivery)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-sm text-slate-600 mb-1">파일규격</span>
                  <input
                    type="text"
                    value={fileRule}
                    onChange={(e) => setFileRule(e.target.value)}
                    className={`input-dark w-full rounded-lg border px-3 py-2 text-sm ${
                      isFieldChanged("fileRule", fileRule)
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  />
                </label>
              </div>
            </section>
          )}

          {/* 제작금액 계산 (책자 및 낱장 모두 표시) */}
          {(() => {
            const cost = calculateProductionCost();
            if (!cost) return null;

            if (orderType === "book" && (spec || mediaId === MEDIA_OTHER) && "coverCost" in cost) {
              const bookCost = cost as {
                coverCost: number;
                innerCost: number;
                additionalInnerCost: number;
                bindingCost: number;
                finishingCost: number;
                subtotal: number;
                vat: number;
                total: number;
                qtyNum: number;
                coverPageCount: number;
                innerPageCount: number;
                additionalInnerPagesTotal: number;
              };
              return (
              <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-medium text-slate-600 mb-4">제작금액</h2>
                <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <div className="font-medium mb-2">계산 내역 (수량: {bookCost.qtyNum}부)</div>
                  <div className="flex justify-between">
                    <span>표지 ({bookCost.coverPageCount}페이지 × 300원 × {bookCost.qtyNum}부)</span>
                    <span className="font-medium">{bookCost.coverCost.toLocaleString()}원</span>
                  </div>
                  {bookCost.innerPageCount > 0 && (
                    <div className="flex justify-between">
                      <span>내지 ({bookCost.innerPageCount}페이지 × 300원 × {bookCost.qtyNum}부)</span>
                      <span className="font-medium">{bookCost.innerCost.toLocaleString()}원</span>
                    </div>
                  )}
                  {bookCost.additionalInnerCost > 0 && (
                    <div className="flex justify-between">
                      <span>추가 내지 (총 {bookCost.additionalInnerPagesTotal}페이지 × 300원 × {bookCost.qtyNum}부)</span>
                      <span className="font-medium">{bookCost.additionalInnerCost.toLocaleString()}원</span>
                    </div>
                  )}
                  {bookCost.bindingCost > 0 && (
                    <div className="flex justify-between">
                      <span>제본 ({binding.includes("무선제본") ? "무선제본" : "중철제본"} {binding.includes("무선제본") ? "2,000원" : "1,500원"} × {bookCost.qtyNum}부)</span>
                      <span className="font-medium">{bookCost.bindingCost.toLocaleString()}원</span>
                    </div>
                  )}
                  {bookCost.finishingCost > 0 && (() => {
                    const finishingLower = finishingSpec.toLowerCase();
                    let coatingPageCount = 2;
                    if (finishingLower.includes("양면")) {
                      coatingPageCount = 4;
                    }
                    return (
                      <div className="flex justify-between">
                        <span>후가공 {
                          finishingLower.includes("에폭시")
                            ? `(에폭시 120,000원)`
                            : `(${coatingPageCount === 4 ? "양면" : "단면"} 코팅/라미네이팅 ${coatingPageCount}페이지 × 500원 × ${bookCost.qtyNum}부)`
                        }</span>
                        <span className="font-medium">{bookCost.finishingCost.toLocaleString()}원</span>
                      </div>
                    );
                  })()}
                  <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-medium text-slate-800">
                    <span>소계</span>
                    <span>{bookCost.subtotal.toLocaleString()}원</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 border-r border-slate-200 pr-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">공급가</span>
                      <span className="text-sm font-medium text-slate-800">{bookCost.subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">부가세 (10%)</span>
                      <span className="text-sm font-medium text-slate-800">{bookCost.vat.toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center pl-4">
                    <div className="text-xs text-slate-500 mb-1">총 결제금액</div>
                    <div className="text-2xl font-bold text-red-600">{bookCost.total.toLocaleString()}원</div>
                  </div>
                </div>
              </section>
            );
            } else if (orderType === "sheet" && "printCost" in cost) {
              const sheetCost = cost as {
                printCost: number;
                finishingCost: number;
                cuttingCost: number;
                subtotal: number;
                vat: number;
                total: number;
                qtyNum: number;
                kindsCount: number;
                sheetsPerKind: number;
              };
              return (
                <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-medium text-slate-600 mb-4">제작금액</h2>
                  <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                    <div className="font-medium mb-2">계산 내역 (종 수: {sheetCost.kindsCount}종, 총 매 수: {sheetCost.qtyNum}매)</div>
                    <div className="flex justify-between">
                      <span>인쇄 비용 ({sheetCost.qtyNum}매 × 300원)</span>
                      <span className="font-medium">{sheetCost.printCost.toLocaleString()}원</span>
                    </div>
                    {sheetCost.finishingCost > 0 && (() => {
                      const finishingLower = getFinishingList().toLowerCase();
                      if (finishingLower.includes("에폭시")) {
                        return (
                          <div className="flex justify-between">
                            <span>후가공 (에폭시 {sheetCost.kindsCount}종 × 120,000원)</span>
                            <span className="font-medium">{sheetCost.finishingCost.toLocaleString()}원</span>
                          </div>
                        );
                      } else if (
                        finishingLower.includes("코팅") ||
                        finishingLower.includes("라미네이팅") ||
                        finishingLower.includes("라미테이팅")
                      ) {
                        const coatingSheets = printSide === "양면" ? sheetCost.qtyNum * 2 : sheetCost.qtyNum;
                        return (
                          <div className="flex justify-between">
                            <span>후가공 (코팅/라미네이팅 {coatingSheets}매 × 500원)</span>
                            <span className="font-medium">{sheetCost.finishingCost.toLocaleString()}원</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-medium text-slate-800">
                      <span>소계</span>
                      <span>{sheetCost.subtotal.toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3 border-r border-slate-200 pr-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">공급가</span>
                        <span className="text-sm font-medium text-slate-800">{sheetCost.subtotal.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">부가세 (10%)</span>
                        <span className="text-sm font-medium text-slate-800">{sheetCost.vat.toLocaleString()}원</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center pl-4">
                      <div className="text-xs text-slate-500 mb-1">총 결제금액</div>
                      <div className="text-2xl font-bold text-red-600">{sheetCost.total.toLocaleString()}원</div>
                    </div>
                  </div>
                </section>
              );
            }
            return null;
          })()}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting ? "제출 중…" : "제출"}
            </button>
            <Link
              href="/list"
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              취소
            </Link>
          </div>
        </form>

        {toast === "err" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow">
            입력을 확인하거나 다시 시도해 주세요.
          </div>
        )}
      </div>
    </>
  );
}
