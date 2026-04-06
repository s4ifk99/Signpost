"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { logSearchResultClick } from "@/components/search-analytics";

type Props = Omit<ComponentProps<typeof Link>, "onClick"> & {
  listingId: string;
  position: number;
  q: string;
  /** Off-site profile (e.g. SRA) — opens in a new tab. */
  openInNewTab?: boolean;
};

export function SearchResultLink({
  listingId,
  position,
  q,
  openInNewTab,
  href,
  className,
  children,
  ...rest
}: Props) {
  const onClick = () => logSearchResultClick({ listingId, position, q });
  if (openInNewTab) {
    return (
      <a
        href={typeof href === "string" ? href : String(href)}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest} onClick={onClick}>
      {children}
    </Link>
  );
}
