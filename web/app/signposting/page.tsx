"use client";

import { useEffect } from "react";

export default function SignpostingRedirectPage() {
  useEffect(() => {
    window.location.replace("/#signposting");
  }, []);

  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-background text-muted-foreground">
      Taking you to signposting on the home page…
    </div>
  );
}
