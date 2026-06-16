export default function AuroraLogo({ className = "" }: { className?: string }) {
  return (
    <img 
      src="/images/logos/logo-desktop.webp" 
      alt="AURORA Racing Logo" 
      width="290"
      height="80"
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
