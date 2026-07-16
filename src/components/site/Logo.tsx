import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/genuine-investment-logo.png.asset.json";

export const LOGO_URL = logoAsset.url;

type LogoProps = {
  className?: string;
  imgClassName?: string;
  linked?: boolean;
  alt?: string;
  priority?: boolean;
};

export function Logo({
  className = "",
  imgClassName = "h-9 w-auto",
  linked = true,
  alt = "Genuine Investment — Together we succeed",
  priority = false,
}: LogoProps) {
  const img = (
    <img
      src={LOGO_URL}
      alt={alt}
      className={`${imgClassName} select-none object-contain transition-transform duration-300 group-hover:scale-105`}
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
  if (!linked) return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  return (
    <Link to="/" aria-label="Genuine Investment — Home" className={`group inline-flex items-center ${className}`}>
      {img}
    </Link>
  );
}
