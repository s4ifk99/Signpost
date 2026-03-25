import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { LawCategories } from "@/components/law-categories";
import { Footer } from "@/components/footer";
import { AISearch } from "@/components/ai-search";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SearchBar />
      <main className="flex-1">
        <LawCategories />
      </main>
      <Footer />
      <AISearch />
    </div>
  );
}
