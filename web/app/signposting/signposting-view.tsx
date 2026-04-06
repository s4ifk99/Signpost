"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export type ResourceLink = { text: string; url: string };

export type Resource = {
  name: string;
  phone?: string;
  description: string;
  url?: string;
  links?: ResourceLink[];
};

export type Section = {
  title: string;
  resources: Resource[];
};

type Props = {
  sections: Section[];
  /** When empty, no Advocate block is shown. */
  advocateResources?: Resource[];
  /** Full page with header/footer vs inline on home */
  variant?: "page" | "embedded";
};

function AccordionSection({ section, defaultOpen = false }: { section: Section; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="pb-6">
          {section.resources.map((resource, idx) => (
            <div key={idx} className="mb-4">
              <p className="text-foreground">
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {resource.name}
                  </a>
                ) : (
                  <span className="font-semibold">{resource.name}</span>
                )}
                {resource.phone && (
                  <span className="text-foreground">
                    –{" "}
                    <a href={`tel:${resource.phone.replace(/\s/g, "")}`} className="text-primary hover:underline">
                      {resource.phone}
                    </a>
                  </span>
                )}
                {resource.description && <span className="text-foreground"> – {resource.description}</span>}
              </p>
              {resource.links && resource.links.length > 0 && (
                <ul className="ml-6 mt-2 list-disc space-y-1">
                  {resource.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SignpostingView({
  sections,
  advocateResources = [],
  variant = "page",
}: Props) {
  const allSections: Section[] =
    advocateResources.length > 0
      ? [...sections, { title: "Advocate directory", resources: advocateResources }]
      : sections;

  const intro = (
    <p className="text-lg text-foreground">
      If we are unable to assist you, here is a list of other organisations and resources that we hope you might
      find useful in your search for the right help.
    </p>
  );

  const mainInner = (
    <>
      {allSections.map((section, idx) => (
        <AccordionSection key={`${section.title}-${idx}`} section={section} defaultOpen={idx === 0} />
      ))}
    </>
  );

  if (variant === "embedded") {
    return (
      <section id="signposting" className="border-t border-border bg-card py-10">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-primary md:text-3xl">Signposting</h2>
          <div className="mt-4">{intro}</div>
          <div className="mt-8">{mainInner}</div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-secondary/60 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Signposting</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">{intro}</div>

      <main className="mx-auto max-w-4xl px-4 pb-12">{mainInner}</main>

      <Footer />
    </div>
  );
}
