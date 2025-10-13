import sanitizeHtml from "sanitize-html";

export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p","b","i","em","strong","a","ul","ol","li","code","pre","h1","h2","h3","blockquote","hr","br","span","img"
    ],
    allowedAttributes: {
      a: ["href","name","target","rel"],
      span: ["class"],
      img: ["src","alt","loading"]
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener", target: "_blank" }),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" })
    },
    allowedSchemes: ["http","https","mailto"],
    exclusiveFilter(frame: any) {
      return !frame.text && !frame.tag;
    }
  });
}
