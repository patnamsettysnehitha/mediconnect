import { HeartPulse } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg gradient-hero">
            <HeartPulse className="size-4 text-primary-foreground" />
          </span>
          <span className="font-display font-bold">{t("brand.name")}</span>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{t("home.disclaimer")}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("brand.name")} · Emergency: 108 / 112
        </p>
      </div>
    </footer>
  );
}
