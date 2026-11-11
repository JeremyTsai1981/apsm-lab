export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // 依語言取欄位：{{ item | t(lang, "title") }}
  eleventyConfig.addFilter("t", (obj, lang, key) => {
    if (!obj) return "";
    const v = obj[key];
    if (v && typeof v === "object") return v[lang] ?? v.zh ?? "";
    return v ?? "";
  });
  // 雙語字串：{{ i18n.hero.title | l(lang) }}
  eleventyConfig.addFilter("l", (v, lang) => (v && typeof v === "object" ? v[lang] ?? v.zh ?? "" : v ?? ""));
  eleventyConfig.addFilter("take", (arr, n) => (arr || []).slice(0, n));
  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
  };
}
