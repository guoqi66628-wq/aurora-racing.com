import { getAssetUrl } from "../utils/cdn";

export default function AuroraLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src={getAssetUrl("/images/logos/logo-desktop.webp")}
      alt="AURORA Racing Logo" 
      width="1620"
      height="529"
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
