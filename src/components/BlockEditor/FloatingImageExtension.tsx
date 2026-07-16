import Image from "@tiptap/extension-image";

/** Image block with Notion-style align, width, and caption. */
export const FloatingImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-width"),
        renderHTML: (attrs) => (attrs.width ? { "data-width": attrs.width } : {}),
      },
      align: {
        default: "center" as string,
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") || "",
        renderHTML: (attrs) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
    };
  },
});
