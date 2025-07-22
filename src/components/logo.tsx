import darkLogo from "@/assets/logos/sidebar-logo-white.png";
import logo from "@/assets/logos/sidebar-logo-blue.png";
import Image from "next/image";

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={`relative ${collapsed ? 'h-0 w-0' : 'h-20 w-36'}`}>
      <Image
        src={logo}
        fill
        className="dark:hidden object-contain"
        alt="NextAdmin logo"
        role="presentation"
        quality={100}
      />

      <Image
        src={darkLogo}
        fill
        className="hidden dark:block object-contain"
        alt="NextAdmin logo"
        role="presentation"
        quality={100}
      />
    </div>
  );
} 