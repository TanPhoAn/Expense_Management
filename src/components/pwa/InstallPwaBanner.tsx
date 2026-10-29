"use client";

import React, { useEffect, useState } from "react";
import { Share, X, Download, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPwaBanner() {
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running standalone
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (standaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user dismissed prompt recently
    const dismissedUntil = localStorage.getItem("pocketflow_pwa_dismissed");
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari =
      /Safari/.test(ua) &&
      !/CriOS/.test(ua) &&
      !/FxiOS/.test(ua) &&
      !/EdgiOS/.test(ua);

    if (isIos && isSafari) {
      setShowIosPrompt(true);
    }

    // 4. Android / Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const dismiss = () => {
    // Dismiss for 7 days
    const expireTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pocketflow_pwa_dismissed", String(expireTime));
    setShowIosPrompt(false);
    setDeferredPrompt(null);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) return null;

  // iOS Safari Prompt
  if (showIosPrompt) {
    return (
      <aside
        aria-label="Cài đặt PocketFlow"
        className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-md mx-auto z-50 bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl p-4 text-foreground animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/apple-touch-icon.png"
                alt="PocketFlow Logo"
                className="w-10 h-10 rounded-xl"
              />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Cài đặt PocketFlow</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dùng như App thật trên iPhone (toàn màn hình, không lag)
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60 text-xs space-y-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] shrink-0">
              1
            </span>
            <span>
              Bấm biểu tượng <strong>Chia sẻ</strong>{" "}
              <Share className="inline w-3.5 h-3.5 mx-0.5 text-primary align-text-bottom" /> ở thanh công cụ Safari.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] shrink-0">
              2
            </span>
            <span>
              Cuộn xuống và chọn{" "}
              <strong>Thêm vào MH chính</strong>{" "}
              <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-primary align-text-bottom" />.
            </span>
          </div>
        </div>
      </aside>
    );
  }

  // Android / Chrome Native Prompt
  if (deferredPrompt) {
    return (
      <aside
        aria-label="Cài đặt PocketFlow"
        className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-md mx-auto z-50 bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl p-4 text-foreground flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="PocketFlow Logo"
              className="w-10 h-10 rounded-xl"
            />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Cài đặt PocketFlow</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Truy cập nhanh từ màn hình chính
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInstallClick} className="gap-1.5 shadow">
            <Download className="w-3.5 h-3.5" />
            Cài đặt
          </Button>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
