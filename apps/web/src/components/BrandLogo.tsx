import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  className = "",
  imageClassName = "h-[26px] w-auto",
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/baf_logo.svg"
        alt="BAF"
        width={85}
        height={26}
        priority={priority}
        className={imageClassName}
      />
    </span>
  );
}

export function BrandBadge({ className = "", priority = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <BrandLogo imageClassName="h-12 w-auto" priority={priority} />
    </span>
  );
}
