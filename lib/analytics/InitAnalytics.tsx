"use client";
import { useEffect } from "react";

interface ScriptLoaderProps {
  hotjarJS?: string;
}

// Hostnames where third-party analytics CDNs (e.g. static.hotjar.com) are
// unreachable, so injecting their scripts would always fail. Covers local dev
// and the v0 preview sandbox as well as Vercel preview deployments.
function isNonProductionHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".vusercontent.net") ||
    hostname.endsWith(".v0.dev") ||
    hostname.endsWith(".vercel.app")
  );
}

export function InitAnalytics(props: ScriptLoaderProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // Only load third-party analytics in a real production environment. In dev
    // and the sandboxed preview the external scripts are blocked and surface as
    // uncaught resource-load errors ({"isTrusted":true}).
    if (process.env.NODE_ENV !== "production" || isNonProductionHost(window.location.hostname)) {
      return;
    }
    let mounted = true;
    if (mounted) {
      const loadScript = (id: string, content: string, defer = false) => {
        const script = document.createElement("script");
        script.id = id;
        script.defer = defer;
        script.innerHTML = content;
        script.onerror = () => console.error(`${id} failed to load.`);
        script.onload = () => console.log(`${id} loaded successfully.`);
        document.head.appendChild(script);
      };

      const scripts: {
        id: string;
        content: string | undefined;
        defer?: boolean;
      }[] = [
          { id: "hotjar-script", content: props.hotjarJS },
        ];

      scripts.forEach(({ id, content, defer }) => {
        if (content && !document.getElementById(id)) {
          loadScript(id, content, defer);
        }
      });
    }
    return () => {
      mounted = false; // cleanup function
    };
  }, []);

  return null;
}

export default InitAnalytics;
