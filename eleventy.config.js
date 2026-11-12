import fs from "node:fs";

const imgs = JSON.parse(fs.readFileSync("src/_data/imgs.json", "utf8"));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

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
  eleventyConfig.addFilter("where", (arr, key, val) => (arr || []).filter((x) => x[key] === val));
  eleventyConfig.addFilter("notPlaceholder", (arr) => (arr || []).filter((x) => !x.placeholder));
  // 著作作者列：主持人姓名加粗
  eleventyConfig.addFilter("hiPI", (s) =>
    esc(s).replace(/(Ying[- ]Kuan Tsai\*?|Y\.-?K\. Tsai\*?|蔡營寬\*?)/g, "<b>$1</b>")
  );
  // 依年份分組（新到舊）
  eleventyConfig.addFilter("byYear", (arr) => {
    const m = new Map();
    [...(arr || [])].sort((a, b) => b.year - a.year).forEach((p) => {
      if (!m.has(p.year)) m.set(p.year, []);
      m.get(p.year).push(p);
    });
    return [...m.entries()].map(([year, items]) => ({ year, items }));
  });

  // 響應式圖片：{% pic root, "render-city", "替代文字", "(min-width:1000px) 33vw, 100vw", "class", false, lang %}
  eleventyConfig.addShortcode("pic", (root, name, alt, sizes, cls = "", eager = false, lang = "zh") => {
    if (lang === "en" && imgs[name + "-en"]) name = name + "-en";
    const m = imgs[name];
    if (!m) throw new Error("pic: unknown image " + name);
    const ws = [...new Set(m.widths)];
    const srcset = ws.map((w) => `${root}assets/img/${name}-${w}.webp ${w}w`).join(", ");
    const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    return `<picture${cls ? ` class="${cls}"` : ""}><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="${root}assets/img/${name}.jpg" width="${m.w}" height="${m.h}" alt="${esc(alt)}" ${load} decoding="async"></picture>`;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
  };
}
