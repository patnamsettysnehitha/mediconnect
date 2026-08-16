import { AlertTriangle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EmergencyCard({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-emergency/40 bg-emergency/8 p-5 sm:p-6",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emergency text-emergency-foreground">
          <AlertTriangle className="size-5" />
        </span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-emergency">{t("emergency.title")}</h3>
          <p className="mt-1 text-sm text-foreground/80">{t("emergency.body")}</p>
          <a
            href="tel:108"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emergency px-5 py-3 text-base font-bold text-emergency-foreground shadow-md transition-transform hover:scale-[1.02]"
          >
            <Phone className="size-5" />
            {t("emergency.call")}
          </a>
        </div>
      </div>
    </div>
  );
}
