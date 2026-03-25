import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t-2 border-primary/20 bg-primary py-10 text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-bold text-accent">ADL</span>
            <div>
              <span className="font-serif text-lg font-semibold">Access Directory for Legal Help</span>
              <p className="text-xs uppercase tracking-widest text-primary-foreground/60">
                <br />
              </p>
            </div>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="#" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              About
            </Link>
            <Link href="#" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              Help / FAQ
            </Link>
            <Link href="#" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              Terms
            </Link>
            <Link href="#" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              Privacy
            </Link>
            <Link href="#" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              Advertise
            </Link>
            <Link href="#" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              Contact
            </Link>
          </nav>
        </div>
        
        <div className="mt-8 border-t border-primary-foreground/20 pt-6 space-y-3">
          <p className="text-center text-xs text-primary-foreground/70">
            The Access Directory for Legal Help (ADL) is dedicated to providing free legal resources and services across the United Kingdom. 
            Our primary focus is connecting users with free legal advice, pro bono services, legal aid, and charitable organisations.
          </p>
          <p className="text-center text-xs text-primary-foreground/70">
            <strong className="text-primary-foreground/90">Affiliate Disclosure:</strong> Some listings marked as "Sponsored" contain affiliate links. 
            If you click through and make a purchase or sign up for a service, we may receive a commission at no additional cost to you. 
            This helps us maintain the directory and continue providing free resources. Sponsored listings are clearly marked and do not affect our recommendations for free services.
          </p>
          <p className="text-center text-xs text-primary-foreground/70">
            This site does not provide legal advice. Always consult with a qualified solicitor for legal matters. 
            For urgent legal issues, contact Citizens Advice on 0800 144 8848 or visit your nearest Law Centre.
          </p>
          <p className="mt-2 text-center text-xs text-primary-foreground/50">
            2026 Access Directory for Legal Help. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
