import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function POSFullscreenButton({ label = "Full screen" }: { label?: string }) {
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullScreen((v) => !v);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void toggle()}
      className="h-10 gap-2 rounded-xl border-[#DDEBE6] bg-white/10 text-current backdrop-blur-sm hover:bg-white/20">
      {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{fullScreen ? "Exit full screen" : label}</span>
    </Button>
  );
}
