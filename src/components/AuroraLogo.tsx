export default function AuroraLogo({ className = "" }: { className?: string }) {
  return (
    <img 
      src="/images/logos/logo-desktop.png" 
      alt="AURORA Racing Logo" 
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
