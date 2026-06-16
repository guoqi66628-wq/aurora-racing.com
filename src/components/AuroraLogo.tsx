export default function AuroraLogo({ className = "" }: { className?: string }) {
  return (
    <img 
      src="/images/logos/logo-desktop.webp" 
      alt="AURORA Racing Logo" 
      width="1620"
      height="529"
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
