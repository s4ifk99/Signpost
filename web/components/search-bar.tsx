"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  return (
    <div className="border-b-2 border-primary/10 bg-secondary/30 py-10">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h1 className="mb-2 font-serif text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Find Legal Assistance
        </h1>
        <p className="mb-6 text-muted-foreground">
          Discover free legal help, pro bono services, and trusted solicitors across the United Kingdom
        </p>
        <form className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search legal advice, solicitors, charities..."
              className="h-12 border-2 border-primary/20 bg-card pl-12 text-base placeholder:text-muted-foreground/60 focus:border-primary/40"
            />
          </div>
          <Button type="submit" className="h-12 px-8 text-base font-medium">
            Search
          </Button>
        </form>
      </div>
    </div>
  );
}
