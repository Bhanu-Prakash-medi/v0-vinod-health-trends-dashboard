"use client";
import { useEffect } from "react";

interface ScriptLoaderProps {
  hotjarJS?: string;
}

export function InitAnalytics(props: ScriptLoaderProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      console.warn("localStorage not available");
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