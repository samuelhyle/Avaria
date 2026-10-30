import { defineField, defineType } from "sanity"

/** Content figures must be accessible, attributable and explicitly reviewed before publication. */
const reviewedImageFields = [
  defineField({
    name: "decorative",
    type: "boolean",
    initialValue: false,
    description: "Only for an image that adds no information beyond adjacent text.",
  }),
  defineField({
    name: "alt",
    title: "Alternative text in this document’s language",
    type: "text",
    rows: 2,
    validation: (rule) =>
      rule.custom((value, context) =>
        (context.parent as { decorative?: boolean })?.decorative ||
        (typeof value === "string" && value.trim().length > 0)
          ? true
          : "Describe the information conveyed by this figure.",
      ),
  }),
  defineField({
    name: "caption",
    type: "text",
    rows: 2,
    description: "Explain scope and important limits in this document’s language.",
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "credit",
    title: "Creator / image credit",
    type: "string",
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "rights",
    title: "License or documented permission",
    type: "string",
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "sourceUrl",
    title: "Original source or asset record",
    type: "url",
    validation: (rule) => rule.required().uri({ scheme: ["https"] }),
  }),
  defineField({
    name: "reviewed",
    title: "Image, rights and scientific/language scope reviewed",
    type: "boolean",
    initialValue: false,
    validation: (rule) =>
      rule.custom((value) =>
        value === true ? true : "Review this figure before publishing the document.",
      ),
  }),
]

export const peptideMonograph = defineType({
  name: "peptideMonograph",
  title: "Peptide monograph",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "tagline", type: "string" }),
    defineField({
      name: "category",
      type: "string",
      options: { list: ["metabolic", "recovery", "cognitive", "longevity", "cosmetic"] },
    }),
    defineField({ name: "casNumber", type: "string" }),
    defineField({ name: "molecularFormula", type: "string" }),
    defineField({ name: "molecularWeight", type: "number" }),
    defineField({ name: "sequence", type: "string" }),
    defineField({
      name: "content",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        { type: "image", options: { hotspot: false }, fields: reviewedImageFields },
      ],
    }),
    defineField({
      name: "citations",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "title", type: "string" },
            { name: "authors", type: "string" },
            { name: "journal", type: "string" },
            { name: "year", type: "number" },
            { name: "doi", type: "string" },
            { name: "url", type: "url" },
          ],
        },
      ],
    }),
    defineField({ name: "publishedAt", type: "datetime" }),
  ],
  preview: { select: { title: "name", subtitle: "tagline" } },
})

export const blogPost = defineType({
  name: "blogPost",
  title: "Blog post",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      initialValue: "en",
      options: { list: ["en", "fi", "sv", "ru"] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "reviewed",
      type: "boolean",
      initialValue: false,
      description: "Scientific and language review completed for this version.",
    }),

    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "excerpt", type: "text", rows: 3 }),
    defineField({ name: "tag", type: "string" }),
    defineField({
      name: "content",
      type: "array",
      of: [
        { type: "block" },
        { type: "image", options: { hotspot: false }, fields: reviewedImageFields },
        { type: "object", name: "peptideCallout", fields: [{ name: "slug", type: "string" }] },
      ],
    }),
    defineField({ name: "author", type: "reference", to: [{ type: "author" }] }),
    defineField({ name: "publishedAt", type: "datetime" }),
    defineField({ name: "readMin", type: "number" }),
    defineField({
      name: "i18n",
      type: "object",
      fields: [
        { name: "fi", type: "reference", to: [{ type: "blogPost" }] },
        { name: "ru", type: "reference", to: [{ type: "blogPost" }] },
        { name: "sv", type: "reference", to: [{ type: "blogPost" }] },
      ],
    }),
  ],
  preview: { select: { title: "title", subtitle: "tag" } },
})

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "credentialsReviewed", type: "boolean", initialValue: false }),
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "role", type: "string" }),
    defineField({ name: "bio", type: "text", rows: 3 }),
    defineField({ name: "avatar", type: "image" }),
  ],
})

export const glossaryTerm = defineType({
  name: "glossaryTerm",
  title: "Glossary term",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      initialValue: "en",
      options: { list: ["en", "fi", "sv", "ru"] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "reviewed",
      type: "boolean",
      initialValue: false,
      description: "Scientific and language review completed for this version.",
    }),

    defineField({ name: "term", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "term" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Analytical", value: "analytical" },
          { title: "Chemistry", value: "chemistry" },
          { title: "Compliance", value: "compliance" },
          { title: "Logistics", value: "logistics" },
          { title: "Product", value: "product" },
          { title: "Regulatory", value: "regulatory" },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "shortDefinition",
      title: "Short definition",
      type: "text",
      rows: 2,
      description: "Shown in the index and as the meta description. Max ~280 characters.",
      validation: (r) => r.required().max(280),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        { type: "image", options: { hotspot: false }, fields: reviewedImageFields },
      ],
    }),
    defineField({
      name: "relatedProductSlugs",
      title: "Related product slugs",
      type: "array",
      of: [{ type: "string" }],
      description: "Product slugs from the catalog that this term is most relevant to.",
    }),
    defineField({
      name: "relatedTerms",
      title: "Related terms",
      type: "array",
      of: [{ type: "reference", to: [{ type: "glossaryTerm" }] }],
    }),
    defineField({
      name: "synonyms",
      type: "array",
      of: [{ type: "string" }],
      title: "Synonyms / acronyms",
    }),
    defineField({ name: "seoTitle", type: "string", title: "SEO title" }),
    defineField({ name: "seoDescription", type: "string", title: "SEO description" }),
  ],
  preview: { select: { title: "term", subtitle: "category" } },
  orderings: [
    {
      title: "Term A→Z",
      name: "termAsc",
      by: [{ field: "term", direction: "asc" }],
    },
  ],
})

export const schemaTypes = [peptideMonograph, blogPost, author, glossaryTerm]
