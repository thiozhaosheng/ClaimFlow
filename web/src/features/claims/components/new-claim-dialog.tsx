"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { 
  X, 
  UploadCloud, 
  Check, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  CreditCard, 
  Receipt,
  FileCheck,
  Info,
  Car,
  Utensils,
  BookOpen,
  Laptop,
  HelpCircle,
  QrCode,
  Cloud,
  Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddClaim } from "../api/queries";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/cn";

interface NewClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: {
    category: string;
    title: string;
    amount: string;
    merchant: string;
    date: string;
    fileName?: string;
  } | null;
}

interface LineItem {
  id: string;
  description: string;
  amount: number;
}

const DEMO_TRANSACTIONS = [
  { id: "TXN-2819", merchant: "Jumbo Seafood", date: "2026-06-25", amount: 318.40, category: "Client Entertainment", uen: "198701234K" },
  { id: "TXN-1082", merchant: "Grab SG", date: "2026-06-10", amount: 23.10, category: "Transport", uen: "201314856E" },
  { id: "TXN-9041", merchant: "Challenger", date: "2026-06-15", amount: 45.50, category: "Office Supplies", uen: "198402834W" },
];

export function NewClaimDialog({ open, onOpenChange, prefillData }: NewClaimDialogProps) {
  const { user } = useSession();
  const addClaimMutation = useAddClaim();
  
  // Onboarding features
  const [showTips, setShowTips] = useState(true);

  // Core Fields
  const [category, setCategory] = useState("Transport");
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  
  // Enterprise Fields
  const [uenNumber, setUenNumber] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Corporate FAST");
  const [selectedTxn, setSelectedTxn] = useState<string | null>(null);

  // Category-Specific States
  // 1. Transport Specifics & Exceptions
  const [transportType, setTransportType] = useState("ride");
  const [rideProvider, setRideProvider] = useState("Grab");
  const [customRideProvider, setCustomRideProvider] = useState("");
  const [rideType, setRideType] = useState("GrabCar");
  const [fromLocation, setFromLocation] = useState("ClaimFlow HQ");
  const [toLocation, setToLocation] = useState("Citibank Changi");
  const [isPeakHour, setIsPeakHour] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [carparkName, setCarparkName] = useState("");

  // 2. Client Entertainment Specifics & Exceptions
  const [entertainmentType, setEntertainmentType] = useState("meal");
  const [clientCompany, setClientCompany] = useState("JPMorgan Chase");
  const [customClientCompany, setCustomClientCompany] = useState("");
  const [mealType, setMealType] = useState("Dinner");
  const [attendees, setAttendees] = useState<string[]>(["Sarah Tan", "Jonathan Chew"]);
  const [newAttendeeName, setNewAttendeeName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [giftOccasion, setGiftOccasion] = useState("");

  // 3. Office Supplies Specifics & Exceptions
  const [suppliesType, setSuppliesType] = useState("it");
  const [itemType, setItemType] = useState("Hardware / Peripherals");
  const [hasAssetTag, setHasAssetTag] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [storageLocation, setStorageLocation] = useState("Level 2 Pantry");

  // 4. Training Specifics & Exceptions
  const [trainingType, setTrainingType] = useState("course");
  const [courseVendor, setCourseVendor] = useState("General Assembly");
  const [courseName, setCourseName] = useState("Next.js Advanced Architecture");
  const [sdfRefId, setSdfRefId] = useState("");
  const [associationName, setAssociationName] = useState("");
  const [validityPeriod, setValidityPeriod] = useState("");

  // Itemized Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "Expense Line Item 1", amount: 0.00 }
  ]);

  // File Upload / Scanner States
  const [fileStaged, setFileStaged] = useState(false);
  const [fileName, setFileName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [ocrSource, setOcrSource] = useState<"mock" | "azure" | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<"grab" | "paynow" | "citibank" | "starbucks" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrParticles, setOcrParticles] = useState<{ id: string; text: string; x: number }[]>([]);
  const [formStep, setFormStep] = useState(1);
  const [ingestMethod, setIngestMethod] = useState<"file" | "card" | "preset">("file");

  const resetForm = () => {
    setCategory("Transport");
    setCustomCategory("");
    setTitle("");
    setMerchant("");
    setDate("");
    setAmount("");
    setUenNumber("");
    setInvoiceRef("");
    setPaymentMethod("Corporate FAST");
    setSelectedTxn(null);
    setLineItems([{ id: "1", description: "Reimbursement Line Item 1", amount: 0 }]);
    setFileStaged(false);
    setFileName("");
    setScanning(false);
    setScanned(false);
    setScanMessage("");
    setOcrSource(null);
    setReceiptFormat(null);
    setIntegrityScore(10);

    // Reset Category Types
    setTransportType("ride");
    setRideProvider("Grab");
    setCustomRideProvider("");
    setRideType("GrabCar");
    setFromLocation("ClaimFlow HQ");
    setToLocation("Citibank Changi");
    setIsPeakHour(false);
    setVehicleNumber("");
    setCarparkName("");
    setEntertainmentType("meal");
    setClientCompany("JPMorgan Chase");
    setCustomClientCompany("");
    setMealType("Dinner");
    setAttendees(["Sarah Tan", "Jonathan Chew"]);
    setNewAttendeeName("");
    setRecipientName("");
    setGiftOccasion("");
    setSuppliesType("it");
    setItemType("Hardware / Peripherals");
    setHasAssetTag(false);
    setAssetId("");
    setStorageLocation("Level 2 Pantry");
    setTrainingType("course");
    setCourseVendor("General Assembly");
    setCourseName("Next.js Advanced Architecture");
    setSdfRefId("");
    setAssociationName("");
    setValidityPeriod("");
    setFormStep(1);
  };

  // OCR Particle drift simulation
  useEffect(() => {
    if (!scanning) {
      setTimeout(() => setOcrParticles([]), 0);
      return;
    }

    const ocrSnippetPool = [
      "Total: S$318.40", "GST 9%: Match", "Merchant: Jumbo Seafood", "Ref: INV-9812", "UEN: 198701234K",
      "Total: S$23.10", "Grab SG", "Ref: INV-GRB-771A", "UEN: 201314856E",
      "Total: S$45.50", "Challenger IT", "Ref: INV-CHL-882", "UEN: 198402834W"
    ];

    const interval = setInterval(() => {
      const randomText = ocrSnippetPool[Math.floor(Math.random() * ocrSnippetPool.length)];
      const id = Math.random().toString();
      const x = Math.random() * 70 + 15; // percentage bounds
      
      setOcrParticles(prev => [...prev.slice(-4), { id, text: randomText, x }]);
    }, 450);

    return () => clearInterval(interval);
  }, [scanning]);

  // Dynamic Claim Integrity Index gamification score state
  const [integrityScore, setIntegrityScore] = useState(10);

  // Sync Prefill data or reset when dialog opens
  useEffect(() => {
    if (open) {
      if (prefillData) {
        setTimeout(() => {
          setCategory(prefillData.category);
          setTitle(prefillData.title);
          setAmount(prefillData.amount);
          setMerchant(prefillData.merchant);
          setDate(prefillData.date);
          setFileName(prefillData.fileName || "citibank_invoice_extract.pdf");
          setFileStaged(true);
          setScanning(false);
          setScanned(true);
          setOcrSource("azure");
          setLineItems([{ id: "1", description: prefillData.title, amount: parseFloat(prefillData.amount) || 0 }]);
        }, 0);
      } else {
        setTimeout(() => resetForm(), 0);
      }
    }
  }, [open, prefillData]);

  // Sync total line items sum to amount field
  useEffect(() => {
    const totalLines = lineItems.reduce((acc, curr) => acc + curr.amount, 0);
    if (totalLines > 0) {
      setTimeout(() => setAmount(totalLines.toFixed(2)), 0);
    }
  }, [lineItems]);

  const claimAmt = parseFloat(amount) || 0;
  const isReceiptRequired = claimAmt > 50;
  const exceedsIrasLimit = category === "Client Entertainment" && claimAmt > 300;
  const perHeadSpend = category === "Client Entertainment" && attendees.length > 0 ? (claimAmt / attendees.length) : 0;

  // Validation Rules
  const isTitleValid = title.trim().length >= 3;
  const isCategoryValid = category !== "Other" || customCategory.trim().length >= 2;
  const isCompanyValid = category !== "Client Entertainment" || entertainmentType !== "meal" || clientCompany !== "Other" || customClientCompany.trim().length >= 2;
  const isProviderValid = category !== "Transport" || transportType !== "ride" || rideProvider !== "Other" || customRideProvider.trim().length >= 2;
  const isUenValid = !uenNumber || /^[0-9TSRF]{9,10}[A-Z]$/i.test(uenNumber.trim());

  const hasValidationError = !isTitleValid || !isCategoryValid || !isCompanyValid || !isProviderValid;
  const canSubmit = !hasValidationError && !addClaimMutation.isPending && (!isReceiptRequired || fileStaged) && claimAmt > 0;

  // Dynamically calculate Integrity index score
  useEffect(() => {
    let score = 10;
    if (uenNumber && isUenValid) score += 15;
    if (invoiceRef) score += 15;
    if (fileStaged) score += 30;
    if (selectedTxn) score += 20;
    if (claimAmt > 0 && !exceedsIrasLimit) score += 10;
    if (lineItems.length > 0 && lineItems[0].amount > 0) score += 10;
    setTimeout(() => setIntegrityScore(Math.min(score, 100)), 0);
  }, [uenNumber, isUenValid, invoiceRef, fileStaged, selectedTxn, claimAmt, exceedsIrasLimit, lineItems]);

  const applyCheatsheetPreset = (preset: "grab" | "dining" | "saas" | "training") => {
    const todayStr = new Date().toISOString().split("T")[0];
    setDate(todayStr);
    setSelectedTxn(null);
    setOcrSource("azure");
    setFileStaged(true);

    if (preset === "grab") {
      setCategory("Transport");
      setTransportType("ride");
      setTitle("Grab ride to Changi Airport client terminal");
      setMerchant("Grab SG");
      setUenNumber("201314856E");
      setInvoiceRef("INV-GRB-771A");
      setRideProvider("Grab");
      setRideType("Premium Car");
      setFromLocation("ClaimFlow HQ");
      setToLocation("Changi Airport");
      setFileName("Grab_Ride_Booking_771A.pdf");
      setLineItems([{ id: "1", description: "Grab Premium ride flight client pickup", amount: 48.20 }]);
    } else if (preset === "dining") {
      setCategory("Client Entertainment");
      setEntertainmentType("meal");
      setTitle("Business Alignment Dinner (Jumbo Seafood)");
      setMerchant("Jumbo Seafood");
      setUenNumber("198701234K");
      setInvoiceRef("INV-JMB-9812");
      setMealType("Dinner");
      setClientCompany("JPMorgan Chase");
      setAttendees(["Sarah Tan", "Jonathan Chew", "Amanda Ng"]);
      setFileName("Jumbo_Dinner_Receipt.pdf");
      setLineItems([{ id: "1", description: "Client dinner meal cost (3 pax)", amount: 210.00 }]);
    } else if (preset === "saas") {
      setCategory("Office Supplies");
      setSuppliesType("it");
      setTitle("GitHub Enterprise SAAS licenses");
      setMerchant("GitHub Inc");
      setUenNumber("198402834W");
      setInvoiceRef("INV-GIT-102");
      setItemType("Software Subscription");
      setHasAssetTag(false);
      setFileName("GitHub_Invoice_2026.pdf");
      setLineItems([{ id: "1", description: "GitHub Enterprise licenses renewal", amount: 150.00 }]);
    } else {
      setCategory("Training");
      setTrainingType("course");
      setTitle("Next.js Advanced Development Bootcamp");
      setMerchant("General Assembly");
      setUenNumber("201011342M");
      setInvoiceRef("INV-GA-9021");
      setCourseVendor("General Assembly");
      setCourseName("Next.js Advanced Architecture");
      setSdfRefId("SDF-GA-342A");
      setFileName("General_Assembly_Bootcamp.pdf");
      setLineItems([{ id: "1", description: "Accredited Next.js bootcamp enrollment", amount: 650.00 }]);
    }
    setScanned(true);
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasValidationError) return;
    const finalAmount = parseFloat(amount) || 0;
    if (!title || finalAmount <= 0) return;

    addClaimMutation.mutate(
      {
        employee: user?.name || "Sarah Tan",
        department: user?.department || "Sales",
        type: category === "Other" ? customCategory : category,
        title: title,
        amount: finalAmount,
        gstAmount: parseFloat((finalAmount * 0.09).toFixed(2)),
        merchant: merchant || null,
        date: date || new Date().toISOString().split("T")[0],
        receiptUrl: fileStaged ? `blob://receipts/${new Date().getTime()}.png` : null,
        ocrSource: ocrSource === "azure" ? "citibank_card_sync" : "sandbox_mock_ocr",
        details: {
          uenNumber,
          invoiceRef,
          paymentMethod,
          lineItemsCount: lineItems.length,
          cardMatchTxn: selectedTxn,
          categoryType: category === "Transport" ? transportType : category === "Client Entertainment" ? entertainmentType : category === "Office Supplies" ? suppliesType : trainingType,
          ...(category === "Transport" && transportType === "ride" ? { rideProvider: rideProvider === "Other" ? customRideProvider : rideProvider, rideType, fromLocation, toLocation, isPeakHour } : {}),
          ...(category === "Transport" && (transportType === "toll" || transportType === "fuel") ? { vehicleNumber, carparkName } : {}),
          ...(category === "Client Entertainment" && entertainmentType === "meal" ? { clientCompany: clientCompany === "Other" ? customClientCompany : clientCompany, mealType, attendees: attendees.join(", ") } : {}),
          ...(category === "Client Entertainment" && entertainmentType === "gift" ? { recipientName, giftOccasion } : {}),
          ...(category === "Office Supplies" && suppliesType === "it" ? { itemType, hasAssetTag, assetId } : {}),
          ...(category === "Office Supplies" && suppliesType === "pantry" ? { storageLocation } : {}),
          ...(category === "Training" && trainingType === "course" ? { courseVendor, courseName, sdfRefId } : {}),
          ...(category === "Training" && (trainingType === "membership" || trainingType === "exam") ? { associationName, validityPeriod } : {})
        }
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        }
      }
    );
  };

  const handleTxnMatch = (txn: typeof DEMO_TRANSACTIONS[0]) => {
    setSelectedTxn(txn.id);
    setOcrSource("azure");
    setCategory(txn.category);
    setTitle(`${txn.merchant} Verified Match`);
    setMerchant(txn.merchant);
    setDate(txn.date);
    setUenNumber(txn.uen);
    setInvoiceRef(`INV-MATCH-${txn.id}`);
    setLineItems([{ id: "1", description: `${txn.merchant} Citibank FAST Verified Log`, amount: txn.amount }]);
    setFileStaged(true);
    setFileName("Citi_Card_Receipt_Verify.pdf");
    setScanned(true);
    setReceiptFormat(null);
  };

  const simulateReceiptScan = (format: "grab" | "paynow" | "citibank" | "starbucks") => {
    setReceiptFormat(format);
    setFileStaged(true);
    setScanning(true);
    setScanned(false);
    setOcrSource("mock");
    setSelectedTxn(null);

    let steps: string[] = [];
    let fileLabel = "";

    if (format === "grab") {
      fileLabel = "Grab_Ride_Booking_771A.pdf";
      steps = [
        "Connecting Grab API endpoint sync...",
        "Identifying Grab Booking ID: ADR-0912-881A...",
        "Reading ride origin: Cecil Street ClaimFlow HQ...",
        "Destination: One-North Grab HQ...",
        "Grab OCR match complete: S$23.10 extracted."
      ];
    } else if (format === "paynow") {
      fileLabel = "DBS_PayNow_Screenshot_9812.png";
      steps = [
        "Scanning DBS PayNow transfer screenshot matrix...",
        "Extracting transaction reference ID: 202606259012...",
        "Recipient UEN check: 198701234K (Jumbo Seafood)...",
        "PayNow validation complete: S$318.40 extracted."
      ];
    } else if (format === "citibank") {
      fileLabel = "AWS_Hosting_Invoice_9041.pdf";
      steps = [
        "Connecting Citibank Corporate Invoice Feed...",
        "Reading supplier: Amazon Web Services SG...",
        "Extracting transaction reference: AWS-SIN-90412...",
        "Validating Cloud Services tax compliance...",
        "AWS billing match complete: S$220.00 extracted."
      ];
    } else {
      fileLabel = "Starbucks_Coffee_Receipt_8102.png";
      steps = [
        "Parsing Starbucks Singapore receipt scan...",
        "Extracting line items: Beverages & pastries...",
        "Verifying team wellness allocation caps...",
        "Starbucks receipt scan complete: S$45.50 extracted."
      ];
    }

    setFileName(fileLabel);

    steps.forEach((msg, idx) => {
      setTimeout(() => {
        setScanMessage(msg);
        
        if (idx === steps.length - 1) {
          setScanning(false);
          setScanned(true);
          const todayStr = new Date().toISOString().split("T")[0];
          setDate(todayStr);

          if (format === "grab") {
            setCategory("Transport");
            setTransportType("ride");
            setTitle("Grab ride to client office");
            setMerchant("Grab SG");
            setUenNumber("201314856E");
            setInvoiceRef("INV-GRB-771A");
            setRideProvider("Grab");
            setRideType("GrabCar");
            setFromLocation("ClaimFlow HQ");
            setToLocation("Grab HQ");
            setLineItems([{ id: "1", description: "Grab Ride - Client alignment", amount: 23.10 }]);
          } else if (format === "paynow") {
            setCategory("Client Entertainment");
            setEntertainmentType("meal");
            setTitle("DBS PayNow Jumbo Seafood Dinner");
            setMerchant("Jumbo Seafood");
            setUenNumber("198701234K");
            setInvoiceRef("INV-JMB-9812");
            setMealType("Dinner");
            setClientCompany("JPMorgan Chase");
            setLineItems([{ id: "1", description: "Client Dinner Meal (Jumbo Seafood)", amount: 318.40 }]);
          } else if (format === "citibank") {
            setCategory("Software");
            setTitle("AWS Cloud Hosting Subscriptions");
            setMerchant("Amazon Web Services SG");
            setUenNumber("201802934D");
            setInvoiceRef("AWS-SIN-90412");
            setLineItems([{ id: "1", description: "AWS EC2 & S3 Cloud Hosting", amount: 220.00 }]);
          } else {
            setCategory("Wellness");
            setTitle("Team Coffee Session Starbucks");
            setMerchant("Starbucks Singapore");
            setUenNumber("199602814G");
            setInvoiceRef("SBUX-T3-8102");
            setLineItems([{ id: "1", description: "Beverages & Pastries for Team Wellness", amount: 45.50 }]);
          }
        }
      }, (idx + 1) * 600);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processStagedFile(file);
  };

  const processStagedFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (name.includes("grab")) {
      simulateReceiptScan("grab");
    } else if (name.includes("paynow") || name.includes("dbs") || name.includes("jumbo") || name.includes("seafood")) {
      simulateReceiptScan("paynow");
    } else if (name.includes("aws") || name.includes("amazon") || name.includes("citibank") || name.includes("citi")) {
      simulateReceiptScan("citibank");
    } else if (name.includes("starbucks") || name.includes("coffee") || name.includes("cafe")) {
      simulateReceiptScan("starbucks");
    } else {
      simulateReceiptScan("citibank");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!scanning) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (scanning) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processStagedFile(file);
    }
  };

  const toggleAttendee = (name: string) => {
    setAttendees(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: Math.random().toString(), description: `Expense Line Item ${prev.length + 1}`, amount: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: "description" | "amount", val: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === "amount" ? parseFloat(val) || 0 : val
        };
      }
      return item;
    }));
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => {
      if (!o) resetForm();
      onOpenChange(o);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 dark:bg-black/45 backdrop-blur-sm transition-all duration-300" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl focus:outline-none transition-all duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-zinc-500/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <CreditCard className="h-4.5 w-4.5 text-accent" />
              </div>
              <div className="text-left leading-tight">
                <Dialog.Title className="text-sm font-black tracking-tight text-fg">
                  Corporate Expense Cockpit
                </Dialog.Title>
                <span className="text-[10px] text-fg-secondary font-medium font-sans">Verify card logs, receipt lines, and compliance criteria.</span>
              </div>
            </div>

            {/* Interactive Onboarding Toggle Switch */}
            <div className="flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1.5 select-none bg-surface/50 border border-border/80 px-2.5 py-1 rounded-xl">
                <input 
                  type="checkbox"
                  id="toggle-tips"
                  checked={showTips}
                  onChange={(e) => setShowTips(e.target.checked)}
                  className="rounded border border-border cursor-pointer h-3.5 w-3.5 text-accent"
                />
                <label htmlFor="toggle-tips" className="text-[10px] font-black text-fg-secondary cursor-pointer flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-accent" />
                  Show Filing Tips
                </label>
              </div>
              <Dialog.Close className="grid h-8 w-8 place-items-center rounded-xl text-fg-secondary hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-border">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>

          {/* Cockpit Grid */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-5 gap-0">
            
            {/* Left Column: Citibank Cards, Receipt Scans & Interactive Cheatsheet */}
            <div className="md:col-span-2 border-r border-border p-6 flex flex-col gap-5 overflow-y-auto bg-zinc-500/[0.01]">
              
              {/* STEP 1: INGESTION SOURCE SELECTORS */}
              {formStep === 1 && (
                <div className="flex flex-col gap-4.5 animate-scale-in">
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-fg-secondary/90 select-none">
                      Select Ingestion Route
                    </span>
                    
                    {/* Ingestion Method Tabs Selector */}
                    <div className="flex bg-zinc-500/[0.03] border border-border/80 rounded-xl p-1 gap-1 select-none">
                      {[
                        { id: "file", label: "Receipt", icon: Receipt },
                        { id: "card", label: "Citi Card", icon: CreditCard },
                        { id: "preset", label: "Presets", icon: HelpCircle }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = ingestMethod === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setIngestMethod(tab.id as any)}
                            className={cn(
                              "flex-grow flex-shrink-0 py-2 px-1.5 rounded-lg text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap",
                              isActive 
                                ? "bg-accent text-accent-fg shadow-sm shadow-accent/20" 
                                : "text-fg-secondary hover:text-fg hover:bg-surface/50"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border/40 my-0.5" />

                  {/* Dynamic Tab Render */}
                  {ingestMethod === "preset" && (
                    <div className="flex flex-col gap-2.5 text-left animate-scale-in">
                      <span className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5 select-none">
                        <HelpCircle className="h-4 w-4 text-accent" />
                        Scenario Presets Cheat Sheet
                      </span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "grab", label: "Grab Taxi", icon: Car, desc: "Standard business ride prefill" },
                          { id: "dining", label: "Client Meal", icon: Utensils, desc: "Dining meal with client" },
                          { id: "saas", label: "SAAS Tool", icon: Laptop, desc: "GitHub software billing" },
                          { id: "training", label: "SDF Course", icon: BookOpen, desc: "SDF funded training course" }
                        ].map(scenario => {
                          const Icon = scenario.icon;
                          return (
                            <button
                              key={scenario.id}
                              type="button"
                              onClick={() => applyCheatsheetPreset(scenario.id as any)}
                              className="p-2 border border-border/80 rounded-xl bg-card hover:bg-surface text-left transition-all active:scale-[0.97] hover:border-accent/40 select-none group cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold text-fg">
                                <Icon className="h-3.5 w-3.5 text-accent group-hover:animate-bounce" />
                                {scenario.label}
                              </div>
                              <span className="text-[10px] text-fg-secondary font-normal mt-0.5 block leading-normal">{scenario.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ingestMethod === "card" && (
                    <div className="flex flex-col gap-3 text-left animate-scale-in">
                      <span className="text-xs font-bold uppercase tracking-wider text-fg-secondary/90 flex items-center gap-1.5 select-none">
                        <CreditCard className="h-4 w-4 text-indigo-500" />
                        Corporate Card Logs
                      </span>
                      
                      <div className="flex flex-col gap-2">
                        {DEMO_TRANSACTIONS.map((txn) => {
                          const isMatched = selectedTxn === txn.id;
                          return (
                            <div
                              key={txn.id}
                              onClick={() => handleTxnMatch(txn)}
                              className={cn(
                                "p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:bg-zinc-500/5 select-none",
                                isMatched 
                                  ? "bg-indigo-500/[0.05] border-indigo-500/35 animate-scale-in"
                                  : "bg-card border-border/80"
                              )}
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-fg">
                                <span className="truncate max-w-[130px]">{txn.merchant}</span>
                                <span className="font-mono">S${txn.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-fg-secondary font-medium mt-1">
                                <span>{txn.date} &middot; {txn.id}</span>
                                <span className={cn(
                                  "font-semibold text-[10px]",
                                  isMatched ? "text-indigo-500" : "text-fg-secondary"
                                )}>
                                  {isMatched ? "Matched ✓" : "Unmatched"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ingestMethod === "file" && (
                    <div className="flex flex-col gap-2.5 text-left animate-scale-in">
                      <div className="flex justify-between items-center select-none">
                        <span className="text-xs font-bold uppercase tracking-wider text-fg-secondary/90 flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-emerald-500" />
                          Receipt Ingestion
                        </span>
                      </div>

                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "relative border border-dashed rounded-2xl p-5.5 transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[160px] overflow-hidden select-none",
                          isDragging
                            ? "border-accent border-2 bg-accent/[0.08] dark:bg-accent/[0.12] scale-[1.02] shadow-[0_4px_20px_rgba(79,70,229,0.15)]"
                            : "border-border bg-card/45 hover:bg-card/75 hover:border-accent/40"
                        )}
                      >
                        {scanning && (
                          <div className="absolute left-0 w-full h-[2px] bg-accent animate-scan z-10 shadow-[0_0_12px_rgba(99,102,241,0.9)]" />
                        )}

                        {/* Floating OCR Particle Streams */}
                        {scanning && ocrParticles.map(p => (
                          <motion.span
                            key={p.id}
                            initial={{ opacity: 0, y: 70, scale: 0.8 }}
                            animate={{ opacity: [0, 0.8, 0], y: 5, scale: [0.8, 1, 0.9] }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ left: `${p.x}%` }}
                            className="absolute text-[8px] font-mono font-bold text-accent bg-accent/5 dark:bg-accent/15 border border-accent/15 px-1.5 py-0.5 rounded-full pointer-events-none select-none z-10 shadow-sm whitespace-nowrap"
                          >
                            {p.text}
                          </motion.span>
                        ))}

                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer z-20"
                          onChange={handleFileChange}
                          disabled={scanning}
                        />

                        {scanning ? (
                          <div className="flex flex-col items-center gap-2 z-10 px-4 w-full">
                            <Loader2 className="h-4.5 w-4.5 text-accent animate-spin" />
                            <span className="font-semibold text-accent text-xs leading-tight truncate w-full mt-1.5">{scanMessage}</span>
                          </div>
                        ) : scanned ? (
                          <div className="flex flex-col items-center leading-none z-10">
                            <Check className="h-4 w-4 text-emerald-500 mb-1 border border-emerald-500/20 bg-emerald-500/10 p-0.5 rounded-full" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-450 text-xs">Ingestion complete</span>
                            <span className="text-xs text-fg-secondary mt-1 truncate max-w-[170px] font-medium">{fileName}</span>
                          </div>
                        ) : isDragging ? (
                          <div className="flex flex-col items-center gap-1.5 z-10 animate-pulse">
                            <UploadCloud className="h-5.5 w-5.5 text-accent" />
                            <span className="font-bold text-accent text-sm">Drop receipt file here...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2.5 z-10 px-4 w-full">
                            <UploadCloud className="h-6 w-6 text-accent mb-0.5 shrink-0" />
                            <div>
                              <span className="font-semibold text-fg text-sm leading-normal block">Drag & drop receipt here, or click to browse</span>
                              <span className="text-xs text-fg-secondary/80 font-medium block mt-0.5">Supports PDF, PNG, JPG (Max 10MB)</span>
                            </div>
                            
                            <div className="border-t border-border/40 w-full my-1.5" />
                            
                            <div className="flex flex-col gap-1.5 w-full">
                              <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider block text-center">Or quick simulate scan:</span>
                              <div className="flex flex-wrap gap-1.5 justify-center z-30">
                                {[
                                  { id: "grab", label: "Grab PDF", icon: Car },
                                  { id: "paynow", label: "PayNow QR", icon: QrCode },
                                  { id: "citibank", label: "Citi Invc", icon: Cloud },
                                  { id: "starbucks", label: "Starbucks", icon: Coffee }
                                ].map((sim) => {
                                  const SimIcon = sim.icon;
                                  const isActive = receiptFormat === sim.id;
                                  return (
                                    <button
                                      key={sim.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        simulateReceiptScan(sim.id as any);
                                      }}
                                      className={cn(
                                        "h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all active:scale-95 flex items-center gap-1 hover:border-accent/40 bg-card z-30",
                                        isActive
                                          ? "bg-accent/10 border-accent/30 text-accent"
                                          : "border-border text-fg-secondary bg-surface/50"
                                      )}
                                    >
                                      <SimIcon className="h-3 w-3 shrink-0" />
                                      {sim.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: INGESTION REFERENCE DECK */}
              {formStep === 2 && (
                <div className="flex flex-col gap-4 text-left animate-scale-in select-none">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-emerald-500" />
                    Ingestion Reference Deck
                  </span>

                  <div className="bg-card border border-border/80 rounded-2xl p-4.5 flex flex-col gap-3.5 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-accent/5 blur-xl pointer-events-none" />
                    
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center shrink-0">
                        {category === "Transport" ? (
                          <Car className="h-5 w-5 text-accent" />
                        ) : category === "Client Entertainment" ? (
                          <Utensils className="h-5 w-5 text-accent" />
                        ) : (
                          <Receipt className="h-5 w-5 text-accent" />
                        )}
                      </div>
                      <div className="leading-tight truncate">
                        <span className="block font-bold text-sm text-fg truncate">
                          {merchant || "Unspecified Merchant"}
                        </span>
                        <span className="text-xs text-fg-secondary font-medium block mt-0.5">
                          {date || "No date set"} &middot; {selectedTxn ? `Citi Match (${selectedTxn})` : "Manual upload"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-border/60 my-1" />

                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-secondary/80">Ingestion Type</span>
                        <span className="font-medium text-fg font-sans leading-normal">
                          {fileStaged ? `Uploaded Document (${fileName.split(".").pop()?.toUpperCase()})` : selectedTxn ? "Credit Card Match" : "Manual Claim Ledger"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-secondary/80">Total Ledger Sum</span>
                        <span className="font-bold text-accent text-sm">
                          S${claimAmt.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-secondary/80">OCR Parser Registry</span>
                        <span className="font-medium text-fg font-sans leading-normal flex items-center gap-1">
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            scanned ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                          )} />
                          {scanned ? `Azure AI Engine Active (${ocrSource === "azure" ? "Direct Synced" : "Prefill Registry"})` : "No OCR scan processed yet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-500/[0.02] border border-border/80 rounded-xl p-3.5 flex flex-col gap-2 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Filing Instructions</span>
                    <span className="text-xs text-fg-secondary font-medium leading-relaxed">
                      Review the category parameters on the right side. The system requires specialized fields for <strong>{category}</strong> to ensure audit compliance. Use the reference details above to verify locations, dates, or supplier companies.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3: INTEGRITY & AUDIT HUD */}
              {formStep === 3 && (
                <div className="bg-zinc-500/[0.03] border border-border p-4.5 rounded-2xl flex flex-col gap-2.5 text-left select-none relative overflow-hidden shadow-inner mt-1 animate-scale-in">
                  <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-accent/10 blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      Claim Integrity Index
                    </span>
                    <span className={cn(
                      "font-mono text-xs font-bold uppercase tracking-wider",
                      integrityScore >= 90 ? "text-emerald-500" : integrityScore >= 60 ? "text-indigo-500" : "text-amber-500"
                    )}>
                      {integrityScore}% &middot; {integrityScore >= 90 ? "Fast Route" : integrityScore >= 60 ? "Standard" : "Audit"}
                    </span>
                  </div>

                  <div className="w-full bg-border h-2 rounded-full overflow-hidden relative">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        integrityScore >= 90 
                          ? "bg-emerald-500 dark:bg-emerald-450 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                          : integrityScore >= 60 
                          ? "bg-indigo-500" 
                          : "bg-amber-500"
                      )}
                      style={{ width: `${integrityScore}%` }}
                    />
                  </div>

                  <p className="text-xs text-fg-secondary font-medium leading-relaxed block">
                    {integrityScore >= 90 
                      ? "✓ 100% integrity match. Claim pre-cleared for instant Citibank FAST clearing disbursement."
                      : "Attach receipt parameters or match card logs to reach 90%+ integrity and unlock immediate automated FAST payout routing."}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Card-Based Structured Entry Fields */}
            <div className="md:col-span-3 p-6 flex flex-col gap-6 overflow-y-auto">
              
              {/* Progress Step Bar */}
              <div className="flex items-center justify-between border-b border-border pb-3.5 mb-2 select-none shrink-0">
                <div className="flex gap-1.5 items-center">
                  {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                          formStep === s 
                            ? "bg-accent text-accent-fg shadow-sm shadow-accent/25" 
                            : formStep > s 
                            ? "bg-emerald-500 text-white animate-scale-in" 
                            : "bg-surface text-fg-secondary border border-border"
                        )}>
                          {formStep > s ? "✓" : s}
                        </div>
                        <span className={cn(
                          "text-[10px] font-extrabold uppercase tracking-wider",
                          formStep === s ? "text-fg" : "text-fg-tertiary"
                        )}>
                          {s === 1 ? "Overview" : s === 2 ? "Specifics" : "Line Items"}
                        </span>
                      </div>
                      {s < 3 && <div className="h-[2px] w-6 bg-border" />}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[9px] font-mono font-bold text-fg-secondary bg-surface border border-border px-2 py-0.5 rounded-lg">
                  Step {formStep} of 3
                </span>
              </div>

              {/* Data Ingestion Status Banner */}
              {scanned && (
                <div className={cn(
                  "p-3 rounded-xl border flex items-center justify-between gap-3 text-[10px] font-bold select-none text-left transition-all duration-300 animate-scale-in",
                  ocrSource === "azure"
                    ? "bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08] border-indigo-500/20 text-indigo-650 dark:text-indigo-400"
                    : "bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border-amber-500/20 text-amber-650 dark:text-amber-400"
                )}>
                  <div className="flex items-center gap-2.5">
                    <Info className="h-4 w-4 shrink-0" />
                    <div className="leading-tight">
                      <span className="block font-black">
                        {ocrSource === "azure" 
                          ? "Citibank FAST Sync Active" 
                          : receiptFormat === "grab" 
                          ? "Mock Grab OCR Active" 
                          : receiptFormat === "paynow" 
                          ? "Mock DBS PayNow OCR Active" 
                          : "Mock Standard Invoice Ingested"}
                      </span>
                      <span className="text-[8.5px] text-fg-secondary font-medium leading-normal block mt-0.5">
                        {ocrSource === "azure" 
                          ? "Extracted parameters verified with Citibank card terminal."
                          : "Simulating live engine parse. Connected to mock prefill registry."}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-wider bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-border/80 shrink-0">
                    {ocrSource === "azure" ? "Bank Match" : receiptFormat ? `${receiptFormat} template` : "Mock Ingest"}
                  </span>
                </div>
              )}

              {/* Section 1 Card */}
              {formStep === 1 && (
                <>
                  <div className="bg-zinc-500/[0.015] dark:bg-white/[0.01] border border-border/80 rounded-[1.25rem] p-4.5 flex flex-col gap-3.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-scale-in">
                <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary text-left border-b border-border pb-1.5 select-none">
                  1. Transaction Overview
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Category</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none font-bold"
                    >
                      <option value="Transport">Transport</option>
                      <option value="Client Entertainment">Client Entertainment</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Training">Training</option>
                      <option value="Other">Other / Miscellaneous</option>
                    </select>
                    {showTips && (
                      <span className="text-[8px] text-accent/80 font-semibold mt-0.5 italic leading-normal select-none">
                        * Used to match company policy caps and IRAS tax deductions.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Claim Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Lunch client alignment meeting"
                      className={cn(
                        "h-9 rounded-xl border px-3 text-xs text-fg focus:outline-none bg-card",
                        !isTitleValid && title.length > 0 ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-accent"
                      )}
                    />
                    {showTips && (
                      <span className="text-[8px] text-accent/80 font-semibold mt-0.5 italic leading-normal select-none">
                        * Provide a descriptive reason for audit reference (min 3 chars).
                      </span>
                    )}
                  </div>

                  {category === "Other" && (
                    <div className="flex flex-col gap-1 text-left col-span-2 animate-scale-in">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-accent">Specify Custom Category</label>
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g. Marketing & Advertising / Postage fees"
                        className={cn(
                          "h-9 rounded-xl border px-3 text-xs text-fg focus:outline-none bg-card font-semibold",
                          !isCategoryValid ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-accent"
                        )}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Supplier Merchant</label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="Supplier name"
                      className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-fg focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Filing Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-fg focus:border-accent focus:outline-none font-sans font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 Card */}
              <div className="bg-zinc-500/[0.015] dark:bg-white/[0.01] border border-border/80 rounded-[1.25rem] p-4.5 flex flex-col gap-3.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary text-left border-b border-border pb-1.5 select-none">
                  2. Tax & Audit Registry
                </span>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Tax ID / UEN</label>
                    <input
                      type="text"
                      value={uenNumber}
                      onChange={(e) => setUenNumber(e.target.value)}
                      placeholder="e.g. 198701234K"
                      className={cn(
                        "h-9 rounded-xl border px-3 text-xs text-fg focus:outline-none font-mono font-bold bg-card",
                        !isUenValid ? "border-amber-500 focus:border-amber-500" : "border-border focus:border-accent"
                      )}
                    />
                    {showTips && (
                      <span className="text-[8px] text-accent/80 font-semibold mt-0.5 italic leading-normal select-none">
                        * Required to verify corporate GST tax deductions.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Invoice / Ref No.</label>
                    <input
                      type="text"
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                      placeholder="e.g. INV-2026-091"
                      className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-fg focus:border-accent focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-fg-secondary">Settlement Route</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none font-bold"
                    >
                      <option value="Corporate FAST">Citibank FAST</option>
                      <option value="PayNow Corporate">Corporate PayNow</option>
                      <option value="GIRO Transfer">GIRO Transfer</option>
                    </select>
                  </div>
                </div>
              </div>
                </>
              )}

              {/* Section 3 Card */}
              {formStep === 2 && (
                <>
                  {category !== "Other" ? (
                    <div className="bg-zinc-500/[0.015] dark:bg-white/[0.01] border border-border/80 rounded-[1.25rem] p-4.5 flex flex-col gap-3.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-scale-in">
                  <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary text-left border-b border-border pb-1.5 select-none">
                    3. Category Specifics
                  </span>
                  
                  {/* 1. TRANSPORT DETAILS & EXCEPTIONS */}
                  {category === "Transport" && (
                    <div className="flex flex-col gap-4 animate-scale-in">
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary flex items-center gap-1.5">
                          <Car className="h-4 w-4 text-indigo-500" />
                          Transport Category Details
                        </span>
                        <select
                          value={transportType}
                          onChange={(e) => setTransportType(e.target.value)}
                          className="h-7 rounded-lg border border-border bg-card px-2 text-[9px] font-bold text-accent uppercase tracking-wider focus:outline-none"
                        >
                          <option value="ride">Ride Hailing / Taxi</option>
                          <option value="toll">ERP / Parking Tolls</option>
                          <option value="transit">Public Transit (EZ-Link)</option>
                          <option value="fuel">Fuel / Petrol Refuel</option>
                        </select>
                      </div>

                      {transportType === "ride" ? (
                        <div className="grid grid-cols-2 gap-4 animate-scale-in">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Origin</label>
                            <select 
                              value={fromLocation}
                              onChange={(e) => setFromLocation(e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                            >
                              <option value="ClaimFlow HQ">ClaimFlow HQ (Cecil St)</option>
                              <option value="Citibank Changi">Citibank Asia Pac (Changi)</option>
                              <option value="Grab HQ">Grab HQ (One-North)</option>
                              <option value="Changi Airport">Changi Airport T4</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Destination</label>
                            <select 
                              value={toLocation}
                              onChange={(e) => setToLocation(e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                            >
                              <option value="Grab HQ">Grab HQ (One-North)</option>
                              <option value="ClaimFlow HQ">ClaimFlow HQ (Cecil St)</option>
                              <option value="Citibank Changi">Citibank Asia Pac (Changi)</option>
                              <option value="Changi Airport">Changi Airport T4</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Ride Provider</label>
                            <select 
                              value={rideProvider}
                              onChange={(e) => setRideProvider(e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                            >
                              <option value="Grab">Grab SG</option>
                              <option value="Gojek">Gojek SG</option>
                              <option value="ComfortDelGro">ComfortDelGro Taxi</option>
                              <option value="Tada">Tada SG</option>
                              <option value="Other">Other Provider</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Ride Tier</label>
                            <select 
                              value={rideType}
                              onChange={(e) => setRideType(e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                            >
                              <option value="GrabCar">Standard GrabCar / GoCar</option>
                              <option value="Premium Car">Premium / Exec tier</option>
                              <option value="GrabShare">Share / Economy tier</option>
                            </select>
                          </div>

                          {rideProvider === "Other" && (
                            <div className="flex flex-col gap-1 text-left col-span-2 animate-scale-in">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-accent">Specify Ride Provider</label>
                              <input
                                type="text"
                                required
                                value={customRideProvider}
                                onChange={(e) => setCustomRideProvider(e.target.value)}
                                placeholder="e.g. Private Limousine Service / Charter Bus"
                                className={cn(
                                  "h-8 rounded-lg border px-2.5 text-xs text-fg focus:outline-none bg-card font-semibold",
                                  !isProviderValid ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-accent"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 animate-scale-in">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Vehicle Number</label>
                            <input
                              type="text"
                              value={vehicleNumber}
                              onChange={(e) => setVehicleNumber(e.target.value)}
                              placeholder="e.g. SGX1234A"
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none font-mono uppercase font-bold"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">
                              {transportType === "toll" ? "Carpark / Toll Gantry" : transportType === "fuel" ? "Station Name" : "Transit card reference"}
                            </label>
                            <input
                              type="text"
                              value={carparkName}
                              onChange={(e) => setCarparkName(e.target.value)}
                              placeholder={transportType === "toll" ? "e.g. Marina Bay Sands Carpark" : transportType === "fuel" ? "e.g. Shell Cecil St" : "SimplyGo Card Ref"}
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. CLIENT ENTERTAINMENT DETAILS & EXCEPTIONS */}
                  {category === "Client Entertainment" && (
                    <div className="flex flex-col gap-4 animate-scale-in">
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary flex items-center gap-1.5">
                          <Utensils className="h-4 w-4 text-indigo-500" />
                          Client Entertainment Details
                        </span>
                        <select
                          value={entertainmentType}
                          onChange={(e) => setEntertainmentType(e.target.value)}
                          className="h-7 rounded-lg border border-border bg-card px-2 text-[9px] font-bold text-accent uppercase tracking-wider focus:outline-none"
                        >
                          <option value="meal">Business Meal / Drinks</option>
                          <option value="gift">Corporate Gift / Hamper</option>
                          <option value="event">Event / Theater Ticket</option>
                        </select>
                      </div>

                      {entertainmentType === "meal" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4 animate-scale-in">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Client Company</label>
                              <select 
                                value={clientCompany}
                                onChange={(e) => setClientCompany(e.target.value)}
                                className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                              >
                                <option value="JPMorgan Chase">JPMorgan Chase</option>
                                <option value="Grab Holdings">Grab Holdings</option>
                                <option value="DBS Bank">DBS Bank</option>
                                <option value="Shopee Pte Ltd">Shopee Pte Ltd</option>
                                <option value="Other">Other Company (Specify)</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Meal Event Type</label>
                              <select 
                                value={mealType}
                                onChange={(e) => setMealType(e.target.value)}
                                className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                              >
                                <option value="Dinner">Business Dinner</option>
                                <option value="Lunch">Working Lunch</option>
                                <option value="Drinks">Evening Client Drinks</option>
                                <option value="Breakfast">Executive Breakfast</option>
                              </select>
                            </div>

                            {clientCompany === "Other" && (
                              <div className="flex flex-col gap-1 text-left col-span-2 animate-scale-in">
                                <label className="text-[9px] font-extrabold uppercase tracking-wider text-accent">Specify Client Company Name</label>
                                <input
                                  type="text"
                                  required
                                  value={customClientCompany}
                                  onChange={(e) => setCustomClientCompany(e.target.value)}
                                  placeholder="e.g. Temasek / Google Singapore"
                                  className={cn(
                                    "h-8 rounded-lg border px-2.5 text-xs text-fg focus:outline-none bg-card font-semibold",
                                    !isCompanyValid ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-accent"
                                  )}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 text-left">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Attendees (Click to Toggle)</label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {[
                                { name: "Sarah Tan", role: "CF" },
                                { name: "Jonathan Chew", role: "JPM" },
                                { name: "Amanda Ng", role: "JPM" },
                                { name: "Lim Wei", role: "CF" }
                              ].map((person) => {
                                const isAdded = attendees.includes(person.name);
                                return (
                                  <button
                                    key={person.name}
                                    type="button"
                                    onClick={() => toggleAttendee(person.name)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-full text-[9px] font-bold border transition-colors cursor-pointer flex items-center gap-1",
                                      isAdded 
                                        ? "bg-accent/10 border-accent/35 text-accent font-black"
                                        : "bg-surface border-border text-fg-tertiary"
                                    )}
                                  >
                                    {person.name} <span className="opacity-70 font-normal">({person.role})</span>
                                  </button>
                                );
                              })}
                              
                              {attendees.filter(name => !["Sarah Tan", "Jonathan Chew", "Amanda Ng", "Lim Wei"].includes(name)).map(name => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => toggleAttendee(name)}
                                  className="px-2.5 py-1 rounded-full text-[9px] font-black border bg-accent/10 border-accent/35 text-accent flex items-center gap-1 cursor-pointer"
                                >
                                  {name} <span className="opacity-70 font-normal">(Guest)</span>
                                </button>
                              ))}
                            </div>

                            {/* Add Custom Attendee Inputs */}
                            <div className="flex gap-2 items-center mt-2.5">
                              <input
                                type="text"
                                value={newAttendeeName}
                                onChange={(e) => setNewAttendeeName(e.target.value)}
                                placeholder="Add custom attendee name..."
                                className="h-7 w-52 rounded-lg border border-border bg-card px-2.5 text-[10px] text-fg focus:border-accent focus:outline-none font-medium"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (newAttendeeName.trim()) {
                                      toggleAttendee(newAttendeeName.trim());
                                      setNewAttendeeName("");
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newAttendeeName.trim()) {
                                    toggleAttendee(newAttendeeName.trim());
                                    setNewAttendeeName("");
                                  }
                                }}
                                className="h-7 px-2.5 rounded-lg bg-accent text-accent-fg text-[9.5px] font-black hover:bg-accent-hover active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Add
                              </button>
                            </div>
                            {showTips && (
                              <span className="text-[8px] text-accent/80 font-semibold mt-1.5 italic leading-normal select-none block">
                                * The system divides total costs by attendees to verify single S$80 per-head limits.
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 animate-scale-in">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Recipient / Organization</label>
                            <input
                              type="text"
                              value={recipientName}
                              onChange={(e) => setRecipientName(e.target.value)}
                              placeholder="e.g. JPMorgan Sales team"
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">
                              {entertainmentType === "gift" ? "Occasion / Festival" : "Event Venue / Type"}
                            </label>
                            <input
                              type="text"
                              value={giftOccasion}
                              onChange={(e) => setGiftOccasion(e.target.value)}
                              placeholder={entertainmentType === "gift" ? "e.g. Mid-Autumn hampers" : "e.g. Sands Expo Center"}
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. OFFICE SUPPLIES DETAILS & EXCEPTIONS */}
                  {category === "Office Supplies" && (
                    <div className="flex flex-col gap-4 animate-scale-in">
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary flex items-center gap-1.5">
                          <Laptop className="h-4 w-4 text-indigo-500" />
                          Office Supplies Details
                        </span>
                        <select
                          value={suppliesType}
                          onChange={(e) => setSuppliesType(e.target.value)}
                          className="h-7 rounded-lg border border-border bg-card px-2 text-[9px] font-bold text-accent uppercase tracking-wider focus:outline-none"
                        >
                          <option value="it">IT Hardware / Software</option>
                          <option value="stationery">Stationery / Print</option>
                          <option value="pantry">Pantry / Catering Supplies</option>
                          <option value="maintenance">Facility Cleaning / First Aid</option>
                        </select>
                      </div>

                      {suppliesType === "it" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4 animate-scale-in">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Supply Item Category</label>
                              <select 
                                value={itemType}
                                onChange={(e) => setItemType(e.target.value)}
                                className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-accent focus:outline-none"
                              >
                                <option value="Hardware / Peripherals">Hardware & computer accessories</option>
                                <option value="Stationary">Office stationery</option>
                                <option value="Software Subscription">Software license/SAAS</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5 justify-end">
                              <div className="flex items-center gap-2 h-8 select-none">
                                <input 
                                  type="checkbox" 
                                  id="asset-tag"
                                  checked={hasAssetTag}
                                  onChange={(e) => setHasAssetTag(e.target.checked)}
                                  className="rounded border border-border cursor-pointer h-4 w-4 text-accent"
                                />
                                <label htmlFor="asset-tag" className="text-[10px] font-bold text-fg-secondary cursor-pointer">
                                  Requires Corporate Asset Tag
                                </label>
                              </div>
                            </div>
                          </div>

                          {hasAssetTag && (
                            <div className="flex flex-col gap-1 animate-scale-in">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Asset ID Tag</label>
                              <input
                                type="text"
                                value={assetId}
                                onChange={(e) => setAssetId(e.target.value)}
                                placeholder="e.g. CF-HW-2026-0912"
                                className="h-8.5 rounded-lg border border-border bg-card px-3 text-xs text-fg focus:border-accent focus:outline-none"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 animate-scale-in">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Delivery / Storage Room</label>
                            <input
                              type="text"
                              value={storageLocation}
                              onChange={(e) => setStorageLocation(e.target.value)}
                              placeholder="e.g. Level 2 Pantry / Reception closet"
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. TRAINING / COURSES DETAILS & EXCEPTIONS */}
                  {category === "Training" && (
                    <div className="flex flex-col gap-4 animate-scale-in">
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-indigo-500" />
                          Training & Education Details
                        </span>
                        <select
                          value={trainingType}
                          onChange={(e) => setTrainingType(e.target.value)}
                          className="h-7 rounded-lg border border-border bg-card px-2 text-[9px] font-bold text-accent uppercase tracking-wider focus:outline-none"
                        >
                          <option value="course">Structured Course / Bootcamp</option>
                          <option value="membership">Professional Membership Fee</option>
                          <option value="exam">Certification Exam Fee</option>
                          <option value="book">Tech Book / Reference Manuals</option>
                        </select>
                      </div>

                      {trainingType === "course" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4 animate-scale-in">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Course Vendor</label>
                              <input 
                                type="text"
                                value={courseVendor}
                                onChange={(e) => setCourseVendor(e.target.value)}
                                className="h-8 rounded-lg border border-border bg-card px-2.5 text-[11px] text-fg focus:border-accent focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">SDF Subsidy ID</label>
                              <input 
                                type="text"
                                value={sdfRefId}
                                onChange={(e) => setSdfRefId(e.target.value)}
                                placeholder="e.g. SDF-981-CF"
                                className="h-8 rounded-lg border border-border bg-card px-2.5 text-[11px] text-fg focus:border-accent focus:outline-none font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Course / Training Title</label>
                            <input 
                              type="text"
                              value={courseName}
                              onChange={(e) => setCourseName(e.target.value)}
                              className="h-8.5 rounded-lg border border-border bg-card px-3 text-xs text-fg focus:border-accent"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 animate-scale-in">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Association / Exam Issuer</label>
                            <input
                              type="text"
                              value={associationName}
                              onChange={(e) => setAssociationName(e.target.value)}
                              placeholder="e.g. Singapore Computer Society"
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-fg-secondary">Validity Period / Book Title</label>
                            <input
                              type="text"
                              value={validityPeriod}
                              onChange={(e) => setValidityPeriod(e.target.value)}
                              placeholder="e.g. 1 Year subscription / O'Reilly React Book"
                              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                    </div>
                  ) : (
                    <div className="bg-zinc-500/[0.015] dark:bg-white/[0.01] border border-border/80 rounded-[1.25rem] p-6 text-center flex flex-col items-center justify-center gap-2 select-none min-h-[160px] animate-scale-in">
                      <Info className="h-6.5 w-6.5 text-accent animate-pulse mb-1" />
                      <span className="font-bold text-fg text-xs uppercase tracking-wider">No Extra Parameters Required</span>
                      <span className="text-[9.5px] text-fg-secondary font-medium leading-normal max-w-xs">
                        The dynamic filing system does not require any additional fields for the &ldquo;Other&rdquo; expense type. Feel free to proceed to review itemized entries!
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Section 4 Card */}
              {formStep === 3 && (
                <>
                  <div className="bg-zinc-500/[0.015] dark:bg-white/[0.01] border border-border/80 rounded-[1.25rem] p-4.5 flex flex-col gap-3.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-scale-in">
                <div className="flex justify-between items-center select-none border-b border-border pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary">
                    4. Itemized Expenses
                  </span>
                  <button 
                    type="button" 
                    onClick={addLineItem}
                    className="text-[9px] font-black text-accent hover:underline flex items-center gap-1 cursor-pointer uppercase tracking-widest"
                  >
                    <Plus className="h-3 w-3" /> Add Item Line
                  </button>
                </div>

                <div className="border border-border/85 rounded-xl overflow-hidden bg-card text-left select-none max-h-[140px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-500/[0.02] border-b border-border/75 text-[9px] font-extrabold uppercase tracking-wider text-fg-tertiary">
                      <tr>
                        <th className="px-3.5 py-2">Description</th>
                        <th className="px-3.5 py-2 w-28 text-right">Amount (S$)</th>
                        <th className="px-3.5 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/65">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-xs border border-transparent hover:border-border/65 focus:border-accent rounded-lg focus:outline-none font-semibold text-fg"
                            />
                          </td>
                          <td className="p-1.5 w-28 font-mono">
                            <input
                              type="number"
                              step="0.01"
                              value={item.amount === 0 ? "" : item.amount}
                              onChange={(e) => updateLineItem(item.id, "amount", e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-transparent px-2 py-1 text-xs border border-transparent hover:border-border/65 focus:border-accent rounded-lg focus:outline-none text-right font-mono font-extrabold text-fg"
                            />
                          </td>
                          <td className="p-1.5 w-10 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.id)}
                              className="text-fg-tertiary hover:text-rose-500 transition-colors p-1 rounded-md cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {showTips && (
                  <span className="text-[8px] text-accent/80 font-semibold mt-0.5 italic leading-normal select-none">
                    * Break down the total bill here. Item lines auto-sum to update the claim totals.
                  </span>
                )}
              </div>

              {/* Section 5: Compliance Audit Summary Card */}
              {claimAmt > 0 && (
                <div className="bg-zinc-550/[0.015] dark:bg-white/[0.01] border border-border/80 rounded-[1.25rem] p-4.5 flex flex-col gap-3.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] select-none animate-scale-in">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      5. Compliance Audit Summary
                    </span>
                    <span className="text-xs font-mono font-bold text-fg-secondary">
                      Total SGD S${claimAmt.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    {hasValidationError && (
                      <div className="bg-rose-500/[0.04] border border-rose-500/15 p-2.5 rounded-xl text-xs text-rose-600 dark:text-rose-455 font-bold leading-relaxed flex gap-1.5 items-start animate-scale-in">
                        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span>Form Validation Error</span>
                          <p className="font-medium text-[10.5px] text-fg-secondary mt-0.5 leading-relaxed">
                            {!isTitleValid && "• Claim Title must be at least 3 characters long.\n"}
                            {!isCategoryValid && "• Please specify custom category description.\n"}
                            {!isCompanyValid && "• Please specify client company name.\n"}
                            {!isProviderValid && "• Please specify ride provider name.\n"}
                          </p>
                        </div>
                      </div>
                    )}

                    {!isUenValid && (
                      <div className="bg-amber-500/[0.04] border border-amber-500/15 p-2 rounded-lg text-xs text-amber-600 dark:text-amber-450 font-bold leading-relaxed flex gap-1.5 items-start animate-scale-in">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span>UEN Format Mismatch</span>
                          <p className="font-medium text-[10.5px] text-fg-secondary mt-0.5 leading-relaxed">
                            Tax ID format does not match standard Singapore UEN structures (e.g. 198701234K). Please double check to prevent verification delays.
                          </p>
                        </div>
                      </div>
                    )}

                    {category === "Transport" && transportType === "ride" && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-fg-secondary font-medium">Route Audit ({fromLocation.split(" ")[0]} &rarr; {toLocation.split(" ")[0]}):</span>
                        <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold text-[10px]">Passed</span>
                      </div>
                    )}

                    {category === "Client Entertainment" && entertainmentType === "meal" && (
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-fg-secondary font-medium">Per-Head Spend Check:</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded border font-bold text-[10px]",
                            perHeadSpend > 80 
                              ? "text-amber-500 bg-amber-500/10 border-amber-500/10" 
                              : "text-emerald-500 bg-emerald-500/10 border-emerald-500/10"
                          )}>
                            S${perHeadSpend.toFixed(2)} / S$80.00 head
                          </span>
                        </div>
                        {perHeadSpend > 80 && (
                          <p className="text-[10.5px] text-amber-600 dark:text-amber-450 leading-relaxed font-bold">
                            ⚠️ Note: Single dining expense exceeds standard S$80 per-head threshold. Single head spend is S${perHeadSpend.toFixed(2)}. Justification remarks will be routed for manual review.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-fg-secondary font-medium">Receipt attachment check:</span>
                      <span className={cn(
                        "font-semibold px-1.5 py-0.5 rounded border",
                        isReceiptRequired && !fileStaged 
                          ? "text-rose-500 bg-rose-500/10 border-rose-500/10" 
                          : "text-emerald-500 bg-emerald-500/10 border-emerald-500/10"
                      )}>
                        {isReceiptRequired 
                          ? fileStaged ? "Ingested" : "Required"
                          : "Verified"}
                      </span>
                    </div>

                    {exceedsIrasLimit && (
                      <div className="bg-rose-500/[0.04] border border-rose-500/15 p-2 rounded-lg text-xs text-rose-600 dark:text-rose-455 font-bold leading-relaxed flex gap-1.5 items-start mt-1 animate-scale-in">
                        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span>IRAS-ENT-300 Limit Exceeded</span>
                          <p className="font-medium text-[10.5px] text-fg-secondary mt-0.5 leading-relaxed">
                            Expense exceeds single event S$300.00 limits by S${(claimAmt - 300).toFixed(2)}. Claim will be routed for manual financial audit verification.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          </div>

          {/* Stepper Navigation Footer Buttons */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-zinc-500/[0.02]">
            <div className="flex items-center gap-1.5 text-[10px] text-fg-tertiary font-bold select-none">
              <FileCheck className="h-4 w-4 text-accent" />
              <span>Block hash verification active</span>
            </div>
            
            <div className="flex gap-2.5">
              {formStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setFormStep(prev => prev - 1)}
                  disabled={addClaimMutation.isPending}
                  className="font-bold shadow-sm cursor-pointer"
                >
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={addClaimMutation.isPending}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              )}

              {formStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => setFormStep(prev => prev + 1)}
                  className="font-bold px-6 bg-accent text-accent-fg hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "font-bold px-6 shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer",
                    canSubmit 
                      ? "bg-accent text-accent-fg hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                      : "bg-border text-fg-tertiary cursor-not-allowed"
                  )}
                >
                  {addClaimMutation.isPending ? "Syncing..." : "Submit Claims Ledger"}
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
