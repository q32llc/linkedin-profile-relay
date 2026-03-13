/**
 * Type declaration for the linkedin-profile-export extractor.
 * The actual implementation is resolved by esbuild from the submodule.
 */

export type LinkedInExport = {
  source: {
    platform: "linkedin";
    profile_url: string;
    captured_at: string;
  };
  top_card: Record<string, string | null>;
  sections: Array<{
    id: string;
    heading: string | null;
    raw_html: string;
    raw_text: string;
    items: unknown[];
  }>;
  warnings: string[];
};

export type ExtractOptions = {
  onProgress?: (state: string) => void;
  expandSections?: boolean;
  scrollPage?: boolean;
  includeRawHtml?: boolean;
  fetchDetailPages?: boolean;
};

export function extractLinkedInProfile(
  doc: Document,
  options?: ExtractOptions
): Promise<LinkedInExport>;
