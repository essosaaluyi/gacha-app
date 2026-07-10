import CookieSettingsPanel from "@/components/trust/CookieSettingsPanel";
import InfoPageLayout from "@/components/trust/InfoPageLayout";

export default function CookieSettingsPage() {
  return (
    <InfoPageLayout
      title="Cookie Settings"
      description="Manage optional cookie choices and review what browser storage is needed for gameplay."
      variant="cookies"
      icon="icon-cookies.svg"
      lastUpdated="2026-06-28"
    >
      <CookieSettingsPanel />
    </InfoPageLayout>
  );
}
